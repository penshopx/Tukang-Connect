import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Issuer, generators } from "openid-client";
import { storage, withTransaction, pool } from "./storage.js";
import { MatchingAgent, PricingAgent, MilestoneAgent, ApplicationRankingAgent, AgentOrchestrator, BrainContractOrchestrator } from "./agents.js";
import { orchestrateAnswer, SEEDED_QUESTIONS } from "./constructionQA.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// ─── Async error propagation ──────────────────────────────────────────────────
// Automatically wrap async route handlers so any rejected promise calls next(err)
// instead of becoming an unhandled rejection that silently crashes the request.
const _routeMethods = ["get", "post", "put", "delete", "patch"];
for (const method of _routeMethods) {
    const original = app[method].bind(app);
    app[method] = (path, ...handlers) => {
        const wrapped = handlers.map((h) => typeof h === "function" && h.constructor.name === "AsyncFunction"
            ? (req, res, next) => h(req, res, next).catch(next)
            : h);
        return original(path, ...wrapped);
    };
}
const publicDir = path.join(__dirname, "../public");
const isProd = fs.existsSync(publicDir);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Use the pg-backed session store in production; fall back to the built-in
// MemoryStore in test environments so tests never need a real pg connection.
const sessionStore = process.env.NODE_ENV !== "test"
    ? new (connectPgSimple(session))({
        pool,
        tableName: "session",
        createTableIfMissing: true,
        pruneSessionInterval: 15 * 60, // prune expired rows every 15 minutes
    })
    : undefined;
app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "kerja-proyek-secret-2025",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
// ─── Replit OIDC setup ────────────────────────────────────────────────────────
let oidcClient = null;
async function getOidcClient() {
    if (oidcClient)
        return oidcClient;
    const issuer = await Issuer.discover("https://replit.com/auth/v2");
    const client = new issuer.Client({
        client_id: process.env.REPL_ID,
        client_secret: "noop", // not used with PKCE
        redirect_uris: [`https://${(process.env.REPLIT_DOMAINS || "").split(",")[0]}/api/auth/replit/callback`],
        response_types: ["code"],
    });
    oidcClient = client;
    return client;
}
const requireAuth = (req, res, next) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });
    next();
};
const requireAdmin = async (req, res, next) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Unauthorized" });
    const user = await storage.getUserById(req.session.userId);
    if (!user || user.role !== "admin")
        return res.status(403).json({ error: "Forbidden" });
    next();
};
// ─── Replit OAuth routes ──────────────────────────────────────────────────────
/** Initiate OAuth flow to *link* a Replit account to the already-logged-in user. */
app.get("/api/auth/replit/link", requireAuth, async (req, res) => {
    try {
        const client = await getOidcClient();
        const state = generators.state();
        const nonce = generators.nonce();
        const codeVerifier = generators.codeVerifier();
        const codeChallenge = generators.codeChallenge(codeVerifier);
        req.session.oidcState = state;
        req.session.oidcNonce = nonce;
        req.session.oidcVerifier = codeVerifier;
        req.session.oidcLinkUserId = req.session.userId; // remember who to link
        const authUrl = client.authorizationUrl({
            scope: "openid profile email",
            state,
            nonce,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });
        res.redirect(authUrl);
    }
    catch (err) {
        console.error("[replit-link] initiation error:", err);
        res.redirect("/profile/edit?error=link_failed");
    }
});
app.get("/api/auth/replit", async (req, res) => {
    try {
        const client = await getOidcClient();
        const state = generators.state();
        const nonce = generators.nonce();
        const codeVerifier = generators.codeVerifier();
        const codeChallenge = generators.codeChallenge(codeVerifier);
        req.session.oidcState = state;
        req.session.oidcNonce = nonce;
        req.session.oidcVerifier = codeVerifier;
        const authUrl = client.authorizationUrl({
            scope: "openid profile email",
            state,
            nonce,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });
        res.redirect(authUrl);
    }
    catch (err) {
        console.error("[replit-auth] initiation error:", err);
        res.redirect("/login?error=auth_failed");
    }
});
app.get("/api/auth/replit/callback", async (req, res) => {
    // ── Phase 1: OIDC token exchange (failures here are auth errors) ─────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let claims;
    let replitId;
    let replitUsername;
    let replitName;
    let replitEmail;
    let linkUserId;
    try {
        const client = await getOidcClient();
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(`https://${(process.env.REPLIT_DOMAINS || "").split(",")[0]}/api/auth/replit/callback`, params, {
            state: req.session.oidcState,
            nonce: req.session.oidcNonce,
            code_verifier: req.session.oidcVerifier,
        });
        claims = tokenSet.claims();
        replitId = claims.sub;
        replitUsername = claims.preferred_username || claims.username || `user_${replitId}`;
        replitName = claims.name || replitUsername;
        replitEmail = claims.email || `${replitUsername}@users.replit.com`;
        // Clean up OIDC session state
        linkUserId = req.session.oidcLinkUserId;
        delete req.session.oidcState;
        delete req.session.oidcNonce;
        delete req.session.oidcVerifier;
        delete req.session.oidcLinkUserId;
    }
    catch (err) {
        console.error("[replit-auth] OIDC token exchange failed:", err);
        return res.redirect("/login?error=auth_failed");
    }
    // ── Phase 2: DB operations (failures here are database errors) ───────────
    try {
        // ── Link mode: attach Replit ID to an already-logged-in account ────────
        if (linkUserId) {
            // Make sure this Replit ID isn't already attached to a *different* account
            const existing = await storage.getUserByReplitId(replitId);
            if (existing && existing.id !== linkUserId) {
                return res.redirect("/profile/edit?error=replit_already_linked");
            }
            await storage.updateUserReplitId(linkUserId, replitId);
            return res.redirect("/profile/edit?success=replit_linked");
        }
        // ── Login / register mode ───────────────────────────────────────────────
        let user = await storage.getUserByReplitId(replitId);
        let isNew = false;
        if (!user) {
            // Check if there's an existing account with the same email
            const byEmail = await storage.getUserByEmail(replitEmail);
            if (byEmail) {
                // Link existing account
                await storage.updateUserReplitId(byEmail.id, replitId);
                user = byEmail;
            }
            else {
                // Create a new account — pick a unique username
                let username = replitUsername.toLowerCase().replace(/[^a-z0-9_]/g, "_");
                const existing = await storage.getUserByUsername(username);
                if (existing)
                    username = `${username}_${Date.now()}`;
                const created = await storage.createUserWithProfile({ username, email: replitEmail, password: "", fullName: replitName, role: "pelanggan", replitId }, {
                    bio: null, location: null, skills: [], category: null, hourlyRate: null,
                    isVerified: false, isMandor: false, certifications: [],
                    avatarUrl: claims.profile_image_url || null,
                    completedProjects: 0, rating: 0, ratingCount: 0,
                    yearsExperience: null, phone: null, kkniLevel: null,
                });
                user = created.user;
                isNew = true;
            }
        }
        req.session.userId = user.id;
        res.redirect(isNew ? "/onboarding" : "/dashboard");
    }
    catch (err) {
        console.error("[replit-auth] database error for replitId=%s:", replitId, err);
        res.redirect("/login?error=db_unavailable");
    }
});
// Auth
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await storage.getUserByEmail(email);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: "Email atau password salah" });
        }
        req.session.userId = user.id;
        const { password: _, ...safeUser } = user;
        res.json(safeUser);
    }
    catch (err) {
        console.error("[login] database error:", err);
        res.status(503).json({ error: "Layanan sedang tidak tersedia. Silakan coba lagi." });
    }
});
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password, fullName, role } = req.body;
        if (await storage.getUserByEmail(email)) {
            return res.status(400).json({ error: "Email sudah terdaftar" });
        }
        if (await storage.getUserByUsername(username)) {
            return res.status(400).json({ error: "Username sudah digunakan" });
        }
        const { user } = await storage.createUserWithProfile({ username, email, password, fullName, role: role || "pelanggan" }, {
            bio: null, location: null, skills: [], category: null, hourlyRate: null,
            isVerified: false, isMandor: false, certifications: [], avatarUrl: null,
            completedProjects: 0, rating: 0, ratingCount: 0, yearsExperience: null,
            phone: null, kkniLevel: null,
        });
        req.session.userId = user.id;
        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
    }
    catch (err) {
        console.error("[register] database error:", err);
        res.status(503).json({ error: "Layanan sedang tidak tersedia. Silakan coba lagi." });
    }
});
app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});
app.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId)
        return res.status(401).json({ error: "Not authenticated" });
    const user = await storage.getUserById(req.session.userId);
    if (!user)
        return res.status(401).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
});
app.put("/api/users/me/role", requireAuth, async (req, res) => {
    const { role } = req.body;
    if (!["pelanggan", "tukang"].includes(role)) {
        return res.status(400).json({ error: "Role tidak valid. Pilih 'pelanggan' atau 'tukang'." });
    }
    await storage.updateUserRole(req.session.userId, role);
    res.json({ success: true, role });
});
app.get("/api/me", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId);
    if (!user)
        return res.status(404).json({ error: "Not found" });
    const profile = await storage.getProfileByUserId(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ ...safeUser, profile });
});
// Profiles
app.get("/api/profiles", async (req, res) => {
    const { search, category, verified, mandor } = req.query;
    const [allProfiles, allUsers] = await Promise.all([
        storage.getProfiles(),
        storage.getUsers(),
    ]);
    let result = allProfiles
        .filter((p) => {
        const user = allUsers.find((u) => u.id === p.userId);
        return user && user.role === "tukang";
    })
        .map((p) => {
        const user = allUsers.find((u) => u.id === p.userId);
        return { ...p, user: { id: user.id, fullName: user.fullName, email: user.email } };
    });
    if (search) {
        const s = search.toLowerCase();
        result = result.filter((p) => p.user.fullName.toLowerCase().includes(s) ||
            p.skills.some((sk) => sk.toLowerCase().includes(s)) ||
            (p.bio && p.bio.toLowerCase().includes(s)));
    }
    if (category)
        result = result.filter((p) => p.category === category);
    if (verified === "true")
        result = result.filter((p) => p.isVerified);
    if (mandor === "true")
        result = result.filter((p) => p.isMandor);
    res.json(result);
});
app.get("/api/profiles/:userId", async (req, res) => {
    const userId = Number(req.params.userId);
    const [profile, user] = await Promise.all([
        storage.getProfileByUserId(userId),
        storage.getUserById(userId),
    ]);
    if (!profile || !user)
        return res.status(404).json({ error: "Not found" });
    const { password: _, ...safeUser } = user;
    res.json({ ...profile, user: safeUser });
});
app.put("/api/profiles", requireAuth, async (req, res) => {
    const updated = await storage.updateProfile(req.session.userId, req.body);
    if (!updated)
        return res.status(404).json({ error: "Profile not found" });
    res.json(updated);
});
// Jobs
app.get("/api/jobs", async (req, res) => {
    const { category, status, clientId, search } = req.query;
    let jobs = await storage.getJobs({
        category: category,
        status: status,
        clientId: clientId ? Number(clientId) : undefined,
    });
    if (search) {
        const s = search.toLowerCase();
        jobs = jobs.filter((j) => j.title.toLowerCase().includes(s) || j.description.toLowerCase().includes(s));
    }
    const users = await storage.getUsers();
    const result = jobs.map((j) => {
        const client = users.find((u) => u.id === j.clientId);
        return { ...j, client: client ? { id: client.id, fullName: client.fullName } : null };
    });
    res.json(result);
});
app.get("/api/jobs/:id", async (req, res) => {
    const job = await storage.getJobById(Number(req.params.id));
    if (!job)
        return res.status(404).json({ error: "Job not found" });
    const [client, worker] = await Promise.all([
        storage.getUserById(job.clientId),
        job.workerId ? storage.getUserById(job.workerId) : Promise.resolve(null),
    ]);
    res.json({
        ...job,
        client: client ? { id: client.id, fullName: client.fullName } : null,
        worker: worker ? { id: worker.id, fullName: worker.fullName } : null,
    });
});
app.post("/api/jobs", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId);
    if (!user)
        return res.status(401).json({ error: "Unauthorized" });
    const job = await storage.createJob({
        ...req.body,
        clientId: user.id,
        status: "open",
        workerId: null,
    });
    await storage.createNotification({
        userId: user.id,
        title: "Proyek Diposting",
        message: `Proyek "${job.title}" berhasil diposting.`,
        type: "success",
        isRead: false,
        link: `/jobs/${job.id}`,
    });
    res.status(201).json(job);
});
app.put("/api/jobs/:id", requireAuth, async (req, res) => {
    const job = await storage.getJobById(Number(req.params.id));
    if (!job)
        return res.status(404).json({ error: "Not found" });
    if (job.clientId !== req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (!user || user.role !== "admin")
            return res.status(403).json({ error: "Forbidden" });
    }
    const updated = await storage.updateJob(Number(req.params.id), req.body);
    res.json(updated);
});
// Job Applications
app.get("/api/jobs/:id/applications", requireAuth, async (req, res) => {
    const [apps, users, profiles] = await Promise.all([
        storage.getApplicationsByJob(Number(req.params.id)),
        storage.getUsers(),
        storage.getProfiles(),
    ]);
    const result = apps.map((a) => {
        const user = users.find((u) => u.id === a.applicantId);
        const profile = profiles.find((p) => p.userId === a.applicantId);
        return { ...a, applicant: user ? { id: user.id, fullName: user.fullName, profile } : null };
    });
    res.json(result);
});
app.post("/api/jobs/:id/apply", requireAuth, async (req, res) => {
    const jobId = Number(req.params.id);
    const job = await storage.getJobById(jobId);
    if (!job)
        return res.status(404).json({ error: "Job not found" });
    const existing = (await storage.getApplicationsByJob(jobId)).find((a) => a.applicantId === req.session.userId);
    if (existing)
        return res.status(400).json({ error: "Sudah melamar" });
    const application = await storage.createApplication({
        jobId,
        applicantId: req.session.userId,
        message: req.body.message || null,
        proposedBudget: req.body.proposedBudget || null,
        status: "pending",
    });
    await storage.createNotification({
        userId: job.clientId,
        title: "Lamaran Baru",
        message: `Ada lamaran baru untuk proyek "${job.title}".`,
        type: "info",
        isRead: false,
        link: `/jobs/${jobId}`,
    });
    res.status(201).json(application);
});
app.put("/api/applications/:id", requireAuth, async (req, res) => {
    const updated = await storage.updateApplication(Number(req.params.id), req.body);
    if (!updated)
        return res.status(404).json({ error: "Not found" });
    res.json(updated);
});
// Job Messages
app.get("/api/jobs/:jobId/messages", requireAuth, async (req, res) => {
    const [msgs, users] = await Promise.all([
        storage.getMessagesByJob(Number(req.params.jobId)),
        storage.getUsers(),
    ]);
    const result = msgs.map((m) => {
        const sender = users.find((u) => u.id === m.senderId);
        return { ...m, sender: sender ? { id: sender.id, fullName: sender.fullName } : null };
    });
    res.json(result);
});
app.post("/api/jobs/:jobId/messages", requireAuth, async (req, res) => {
    const msg = await storage.createMessage({
        jobId: Number(req.params.jobId),
        senderId: req.session.userId,
        content: req.body.content,
    });
    res.status(201).json(msg);
});
// Contracts
app.get("/api/contracts", requireAuth, async (req, res) => {
    const [contracts, users] = await Promise.all([
        storage.getContracts(req.session.userId),
        storage.getUsers(),
    ]);
    const result = contracts.map((c) => {
        const client = users.find((u) => u.id === c.clientId);
        const worker = users.find((u) => u.id === c.workerId);
        return {
            ...c,
            client: client ? { id: client.id, fullName: client.fullName } : null,
            worker: worker ? { id: worker.id, fullName: worker.fullName } : null,
        };
    });
    res.json(result);
});
app.get("/api/contracts/:id", requireAuth, async (req, res) => {
    const contract = await storage.getContractById(Number(req.params.id));
    if (!contract)
        return res.status(404).json({ error: "Not found" });
    const [milestones, reports, client, worker] = await Promise.all([
        storage.getMilestonesByContract(contract.id),
        storage.getReportsByContract(contract.id),
        storage.getUserById(contract.clientId),
        storage.getUserById(contract.workerId),
    ]);
    res.json({
        ...contract,
        milestones,
        reports,
        client: client ? { id: client.id, fullName: client.fullName } : null,
        worker: worker ? { id: worker.id, fullName: worker.fullName } : null,
    });
});
app.post("/api/contracts", requireAuth, async (req, res) => {
    const contract = await storage.createContract(req.body);
    res.status(201).json(contract);
});
app.put("/api/contracts/:id", requireAuth, async (req, res) => {
    const updated = await storage.updateContract(Number(req.params.id), req.body);
    if (!updated)
        return res.status(404).json({ error: "Not found" });
    res.json(updated);
});
app.post("/api/contracts/:id/sign", requireAuth, async (req, res) => {
    const contract = await storage.getContractById(Number(req.params.id));
    if (!contract)
        return res.status(404).json({ error: "Not found" });
    const userId = req.session.userId;
    let updateData = {};
    if (contract.clientId === userId)
        updateData.clientSigned = true;
    else if (contract.workerId === userId)
        updateData.workerSigned = true;
    else
        return res.status(403).json({ error: "Not authorized" });
    const updated = await storage.updateContract(contract.id, updateData);
    res.json(updated);
});
// Milestones
app.post("/api/contracts/:contractId/milestones", requireAuth, async (req, res) => {
    const milestone = await storage.createMilestone({ ...req.body, contractId: Number(req.params.contractId) });
    res.status(201).json(milestone);
});
app.put("/api/milestones/:id/submit", requireAuth, async (req, res) => {
    const updated = await storage.updateMilestone(Number(req.params.id), { status: "submitted", notes: req.body.notes });
    res.json(updated);
});
app.put("/api/milestones/:id/approve", requireAuth, async (req, res) => {
    const updated = await storage.updateMilestone(Number(req.params.id), {
        status: "approved",
        completedAt: new Date().toISOString(),
    });
    res.json(updated);
});
app.put("/api/milestones/:id/reject", requireAuth, async (req, res) => {
    const updated = await storage.updateMilestone(Number(req.params.id), { status: "rejected", notes: req.body.notes });
    res.json(updated);
});
// Contract Reports
app.get("/api/contracts/:contractId/reports", requireAuth, async (req, res) => {
    const reports = await storage.getReportsByContract(Number(req.params.contractId));
    res.json(reports);
});
app.post("/api/contracts/:contractId/reports", requireAuth, async (req, res) => {
    const report = await storage.createReport({
        ...req.body,
        contractId: Number(req.params.contractId),
        reporterId: req.session.userId,
        attachments: [],
    });
    res.status(201).json(report);
});
// Disputes
app.get("/api/disputes", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId);
    const disputes = user?.role === "admin" ? await storage.getDisputes() : await storage.getDisputes(req.session.userId);
    res.json(disputes);
});
app.post("/api/disputes", requireAuth, async (req, res) => {
    const dispute = await storage.createDispute({
        ...req.body,
        raisedById: req.session.userId,
        status: "open",
        resolution: null,
        resolvedAt: null,
    });
    res.status(201).json(dispute);
});
app.put("/api/disputes/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateDispute(Number(req.params.id), req.body);
    res.json(updated);
});
// Reviews
app.get("/api/reviews/:userId", async (req, res) => {
    const [reviews, users] = await Promise.all([
        storage.getReviewsByUser(Number(req.params.userId)),
        storage.getUsers(),
    ]);
    const result = reviews.map((r) => {
        const reviewer = users.find((u) => u.id === r.reviewerId);
        return { ...r, reviewer: reviewer ? { id: reviewer.id, fullName: reviewer.fullName } : null };
    });
    res.json(result);
});
app.get("/api/reviews/:userId/rating", async (req, res) => {
    const rating = await storage.getRating(Number(req.params.userId));
    res.json(rating);
});
app.post("/api/reviews/:userId", requireAuth, async (req, res) => {
    const review = await storage.createReview({
        ...req.body,
        reviewerId: req.session.userId,
        revieweeId: Number(req.params.userId),
    });
    res.status(201).json(review);
});
// Portfolio
app.get("/api/portfolio", requireAuth, async (req, res) => {
    const items = await storage.getPortfolioByUser(req.session.userId);
    res.json(items);
});
app.get("/api/portfolio/:userId", async (req, res) => {
    const items = await storage.getPortfolioByUser(Number(req.params.userId));
    res.json(items);
});
app.post("/api/portfolio", requireAuth, async (req, res) => {
    const item = await storage.createPortfolioItem({ ...req.body, userId: req.session.userId });
    res.status(201).json(item);
});
app.delete("/api/portfolio/:id", requireAuth, async (req, res) => {
    const success = await storage.deletePortfolioItem(Number(req.params.id), req.session.userId);
    if (!success)
        return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
});
// Notifications
app.get("/api/notifications", requireAuth, async (req, res) => {
    const notifs = await storage.getNotifications(req.session.userId);
    res.json(notifs);
});
app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    const count = await storage.getUnreadCount(req.session.userId);
    res.json({ count });
});
app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    await storage.markNotificationRead(Number(req.params.id), req.session.userId);
    res.json({ success: true });
});
app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    await storage.markAllRead(req.session.userId);
    res.json({ success: true });
});
// Admin
app.get("/api/admin/status", requireAdmin, async (req, res) => {
    const analytics = await storage.getAnalytics();
    res.json(analytics);
});
app.get("/api/admin/profiles", requireAdmin, async (req, res) => {
    const [users, profiles] = await Promise.all([
        storage.getUsers(),
        storage.getProfiles(),
    ]);
    const result = users.map((u) => {
        const profile = profiles.find((p) => p.userId === u.id);
        const { password: _, ...safeUser } = u;
        return { ...safeUser, profile };
    });
    res.json(result);
});
app.put("/api/admin/verifications/:userId", requireAdmin, async (req, res) => {
    const updated = await storage.updateProfile(Number(req.params.userId), { isVerified: req.body.isVerified });
    if (!updated)
        return res.status(404).json({ error: "Not found" });
    res.json(updated);
});
app.get("/api/admin/disputes", requireAdmin, async (req, res) => {
    res.json(await storage.getDisputes());
});
// Analytics
app.get("/api/analytics/summary", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId);
    if (!user)
        return res.status(401).json({ error: "Unauthorized" });
    if (user.role === "admin") {
        return res.json(await storage.getAnalytics());
    }
    const [jobs, applications, contracts, notifications] = await Promise.all([
        storage.getJobs({ clientId: user.id }),
        storage.getApplicationsByUser(user.id),
        storage.getContracts(user.id),
        storage.getNotifications(user.id),
    ]);
    res.json({
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j) => j.status === "open" || j.status === "in_progress").length,
        completedJobs: jobs.filter((j) => j.status === "completed").length,
        totalApplications: applications.length,
        acceptedApplications: applications.filter((a) => a.status === "accepted").length,
        activeContracts: contracts.filter((c) => c.status === "active").length,
        unreadNotifications: notifications.filter((n) => !n.isRead).length,
    });
});
// Experts (alias for profiles)
app.get("/api/experts", async (req, res) => {
    const { search, category } = req.query;
    const [allProfiles, allUsers] = await Promise.all([
        storage.getProfiles(),
        storage.getUsers(),
    ]);
    let result = allProfiles
        .filter((p) => {
        const user = allUsers.find((u) => u.id === p.userId);
        return user && user.role === "tukang";
    })
        .map((p) => {
        const user = allUsers.find((u) => u.id === p.userId);
        return { ...p, user: { id: user.id, fullName: user.fullName, email: user.email } };
    });
    if (search) {
        const s = search.toLowerCase();
        result = result.filter((p) => p.user.fullName.toLowerCase().includes(s) ||
            p.skills.some((sk) => sk.toLowerCase().includes(s)));
    }
    if (category)
        result = result.filter((p) => p.category === category);
    res.json(result);
});
app.get("/api/experts/:userId", async (req, res) => {
    const userId = Number(req.params.userId);
    const [profile, user, reviews, portfolio] = await Promise.all([
        storage.getProfileByUserId(userId),
        storage.getUserById(userId),
        storage.getReviewsByUser(userId),
        storage.getPortfolioByUser(userId),
    ]);
    if (!profile || !user)
        return res.status(404).json({ error: "Not found" });
    const { password: _, ...safeUser } = user;
    res.json({ ...profile, user: safeUser, reviews, portfolio });
});
// Users (admin)
app.get("/api/users", requireAdmin, async (req, res) => {
    const users = (await storage.getUsers()).map(({ password: _, ...u }) => u);
    res.json(users);
});
// Cost Estimation
app.post("/api/estimates", requireAuth, (req, res) => {
    const { category, area, quality } = req.body;
    const baseRates = {
        Renovasi: 1500000,
        "Konstruksi Baru": 3500000,
        Pengecatan: 80000,
        Lantai: 350000,
        Listrik: 500000,
        Plambing: 600000,
        Atap: 450000,
        Pondasi: 2000000,
        Interior: 2500000,
        Las: 1200000,
    };
    const qualityMultiplier = {
        ekonomis: 0.75,
        standar: 1.0,
        premium: 1.5,
    };
    const base = baseRates[category] || 1500000;
    const multiplier = qualityMultiplier[quality] || 1.0;
    const areaNum = Number(area) || 50;
    const laborCost = base * areaNum * multiplier * 0.35;
    const materialCost = base * areaNum * multiplier * 0.55;
    const overhead = base * areaNum * multiplier * 0.1;
    const total = laborCost + materialCost + overhead;
    res.json({
        laborCost: Math.round(laborCost),
        materialCost: Math.round(materialCost),
        overhead: Math.round(overhead),
        total: Math.round(total),
        perM2: Math.round(total / areaNum),
    });
});
// ─── Smart Accept Application → Auto Contract + Milestones ──────────────────
app.post("/api/jobs/:jobId/applications/:appId/accept", requireAuth, async (req, res) => {
    const jobId = Number(req.params.jobId);
    const appId = Number(req.params.appId);
    const job = await storage.getJobById(jobId);
    if (!job)
        return res.status(404).json({ error: "Job not found" });
    if (job.clientId !== req.session.userId)
        return res.status(403).json({ error: "Forbidden" });
    const application = await storage.getApplicationById(appId);
    if (!application)
        return res.status(404).json({ error: "Application not found" });
    const budget = application.proposedBudget || job.budget;
    const startDate = new Date().toISOString();
    const workerUser = await storage.getUserById(application.applicantId);
    const milestones = MilestoneAgent.generateMilestones(job.category, budget, startDate);
    // All core writes are atomic: partial failure rolls back and the client gets a
    // structured error instead of an inconsistent job/contract/milestone state.
    // The accept update is guarded with WHERE status = 'pending' so that a second
    // concurrent request for the same application finds 0 rows and returns a 409
    // rather than producing two accepted contracts.
    const contract = await withTransaction(async (client) => {
        const acceptResult = await client.query("UPDATE job_applications SET status = 'accepted' WHERE id = $1 AND status = 'pending' RETURNING id", [appId]);
        if (acceptResult.rowCount === 0) {
            const err = new Error("Application already processed");
            err.status = 409;
            throw err;
        }
        // Reject remaining pending applications in one statement
        await client.query("UPDATE job_applications SET status = 'rejected' WHERE job_id = $1 AND id <> $2 AND status = 'pending'", [jobId, appId]);
        // Claim the job atomically — serializes two concurrent accepts for different
        // applications on the same job. If another transaction already claimed it,
        // this returns 0 rows and we roll back with 409.
        const jobClaim = await client.query("UPDATE jobs SET worker_id = $1, status = 'in_progress' WHERE id = $2 AND status = 'open' RETURNING id", [application.applicantId, jobId]);
        if (jobClaim.rowCount === 0) {
            const err = new Error("Job already assigned to another worker");
            err.status = 409;
            throw err;
        }
        const cr = await client.query(`INSERT INTO contracts (job_id, client_id, worker_id, title, description, total_value, status,
        client_signed, worker_signed, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [jobId, job.clientId, application.applicantId, `Kontrak: ${job.title}`, job.description,
            budget, "active", true, false, startDate, job.deadline || null]);
        const contract = cr.rows[0];
        for (const ms of milestones) {
            await client.query(`INSERT INTO milestones (contract_id, title, description, amount, status, due_date, completed_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [contract.id, ms.title, ms.description, ms.amount, "in_progress", ms.dueDate || null, null, null]);
        }
        return contract;
    });
    // Notifications are best-effort — a failure here should not undo the accepted contract
    await Promise.all([
        storage.createNotification({
            userId: application.applicantId,
            title: "Lamaran Diterima! 🎉",
            message: `Lamaran Anda untuk "${job.title}" diterima. Kontrak dengan ${milestones.length} milestone sudah siap ditandatangani.`,
            type: "success",
            isRead: false,
            link: `/contracts/${contract.id}`,
        }).catch((e) => console.error("[notify] accept-application worker:", e)),
        storage.createNotification({
            userId: job.clientId,
            title: "Kontrak Dibuat Otomatis",
            message: `Kontrak untuk "${job.title}" dengan ${workerUser?.fullName || "tukang"} berhasil dibuat lengkap dengan ${milestones.length} milestone pembayaran.`,
            type: "success",
            isRead: false,
            link: `/contracts/${contract.id}`,
        }).catch((e) => console.error("[notify] accept-application client:", e)),
        ...(await storage.getApplicationsByJob(jobId))
            .filter((a) => a.id !== appId && a.status === "rejected")
            .map((a) => storage.createNotification({
            userId: a.applicantId,
            title: "Lamaran Tidak Diterima",
            message: `Maaf, lamaran Anda untuk proyek "${job.title}" tidak dipilih kali ini. Tetap semangat!`,
            type: "info",
            isRead: false,
            link: `/jobs/${jobId}`,
        }).catch((e) => console.error("[notify] reject-application:", e))),
    ]);
    res.json({ contract, milestonesCreated: milestones.length });
});
// ─── Complete Contract → Update Stats + Review Notification ─────────────────
app.post("/api/contracts/:id/complete", requireAuth, async (req, res) => {
    const contractId = Number(req.params.id);
    const contract = await storage.getContractById(contractId);
    if (!contract)
        return res.status(404).json({ error: "Not found" });
    if (contract.clientId !== req.session.userId) {
        return res.status(403).json({ error: "Hanya klien yang dapat menyelesaikan kontrak" });
    }
    const milestones = await storage.getMilestonesByContract(contractId);
    const pendingCount = milestones.filter((m) => m.status !== "approved" && m.status !== "rejected").length;
    if (milestones.length > 0 && pendingCount > 0) {
        return res.status(400).json({
            error: `Masih ada ${pendingCount} milestone yang belum diselesaikan. Selesaikan semua milestone terlebih dahulu.`,
        });
    }
    // Core state updates are atomic. The contract UPDATE is guarded with
    // WHERE status = 'active' so a second concurrent completion request finds 0
    // rows and gets a 409 rather than double-incrementing completed_projects.
    // The counter uses SQL arithmetic to avoid a read-modify-write race.
    const updated = await withTransaction(async (client) => {
        const cr = await client.query("UPDATE contracts SET status = 'completed', end_date = $1 WHERE id = $2 AND status = 'active' RETURNING id", [new Date().toISOString(), contractId]);
        if (cr.rowCount === 0) {
            const err = new Error("Contract already completed or not active");
            err.status = 409;
            throw err;
        }
        await client.query("UPDATE jobs SET status = 'completed' WHERE id = $1", [contract.jobId]);
        await client.query("UPDATE profiles SET completed_projects = completed_projects + 1 WHERE user_id = $1", [contract.workerId]);
        return true;
    });
    if (!updated)
        return; // transaction threw and error handler responded
    const [job, clientUser, workerUser] = await Promise.all([
        storage.getJobById(contract.jobId),
        storage.getUserById(contract.clientId),
        storage.getUserById(contract.workerId),
    ]);
    const jobTitle = job?.title || "Proyek";
    await Promise.all([
        storage.createNotification({
            userId: contract.workerId,
            title: "Proyek Selesai! 🎉",
            message: `${clientUser?.fullName || "Klien"} telah menyelesaikan kontrak "${jobTitle}". Profil Anda diperbarui.`,
            type: "success",
            isRead: false,
            link: `/contracts/${contractId}`,
        }),
        storage.createNotification({
            userId: contract.clientId,
            title: "Berikan Ulasan",
            message: `Proyek "${jobTitle}" selesai! Berikan ulasan untuk ${workerUser?.fullName || "tukang"} untuk membantu komunitas.`,
            type: "info",
            isRead: false,
            link: `/experts/${contract.workerId}`,
        }),
    ]);
    res.json({ success: true, contractId, workerName: workerUser?.fullName, workerId: contract.workerId });
});
// ─── Dashboard: Upcoming Milestones Lintas Kontrak ───────────────────────────
app.get("/api/dashboard/milestones", requireAuth, async (req, res) => {
    const userId = req.session.userId;
    const allContracts = await storage.getContracts(userId);
    const activeContracts = allContracts.filter((c) => c.status === "active");
    const result = [];
    await Promise.all(activeContracts.map(async (c) => {
        const [milestones, job] = await Promise.all([
            storage.getMilestonesByContract(c.id),
            storage.getJobById(c.jobId),
        ]);
        milestones
            .filter((m) => m.status !== "approved" && m.status !== "rejected")
            .forEach((m) => {
            result.push({ ...m, contractId: c.id, jobTitle: job?.title || "Proyek", contractTitle: c.title });
        });
    }));
    result.sort((a, b) => {
        if (!a.dueDate)
            return 1;
        if (!b.dueDate)
            return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    res.json(result.slice(0, 8));
});
// ─── Agent Routes ────────────────────────────────────────────────────────────
app.get("/api/agents/match/:jobId", async (req, res) => {
    const job = await storage.getJobById(Number(req.params.jobId));
    if (!job)
        return res.status(404).json({ error: "Job not found" });
    const limit = Number(req.query.limit) || 5;
    const results = await MatchingAgent.findBestWorkers(job, limit);
    res.json({ agent: MatchingAgent.name, jobId: job.id, results });
});
app.post("/api/agents/price-suggest", (req, res) => {
    const { category, location, existingBudget } = req.body;
    if (!category || !location)
        return res.status(400).json({ error: "category dan location diperlukan" });
    const result = PricingAgent.suggestPrice(category, location, existingBudget ? Number(existingBudget) : undefined);
    res.json({ agent: PricingAgent.name, ...result });
});
app.post("/api/agents/milestones", (req, res) => {
    const { category, budget, startDate } = req.body;
    if (!category || !budget)
        return res.status(400).json({ error: "category dan budget diperlukan" });
    const milestones = MilestoneAgent.generateMilestones(category, Number(budget), startDate);
    res.json({ agent: MilestoneAgent.name, category, budget: Number(budget), milestones });
});
app.get("/api/agents/rank-applications/:jobId", requireAuth, async (req, res) => {
    const jobId = Number(req.params.jobId);
    const [job, user] = await Promise.all([
        storage.getJobById(jobId),
        storage.getUserById(req.session.userId),
    ]);
    if (!job)
        return res.status(404).json({ error: "Job not found" });
    if (!user)
        return res.status(401).json({ error: "Unauthorized" });
    if (job.clientId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Hanya pemilik proyek yang dapat melihat ranking lamaran" });
    }
    const ranked = await ApplicationRankingAgent.rankApplications(jobId);
    res.json({ agent: ApplicationRankingAgent.name, jobId, ranked });
});
app.get("/api/agents/insights", requireAuth, async (req, res) => {
    const insights = await AgentOrchestrator.getDashboardInsights(req.session.userId);
    if (!insights)
        return res.status(404).json({ error: "Not found" });
    res.json(insights);
});
app.get("/api/agents/brain-project/:jobId", requireAuth, async (req, res) => {
    const jobId = Number(req.params.jobId);
    const [job, user] = await Promise.all([
        storage.getJobById(jobId),
        storage.getUserById(req.session.userId),
    ]);
    if (!job)
        return res.status(404).json({ error: "Job not found" });
    if (!user)
        return res.status(401).json({ error: "Unauthorized" });
    if (job.clientId !== req.session.userId && user.role !== "admin") {
        return res.status(403).json({ error: "Hanya pemilik proyek yang dapat mengakses Brain Project" });
    }
    const [applications, ranked, matchedWorkers] = await Promise.all([
        storage.getApplicationsByJob(jobId),
        ApplicationRankingAgent.rankApplications(jobId),
        MatchingAgent.findBestWorkers(job, 5),
    ]);
    const priceSuggestion = PricingAgent.suggestPrice(job.category, job.location, job.budget);
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.jobId === jobId && c.status === "active") || null;
    const milestones = contract ? await storage.getMilestonesByContract(contract.id) : [];
    let riskScore = 0;
    const riskFactors = [];
    if (job.budget < priceSuggestion.adjustedMin * 10) {
        riskScore += 30;
        riskFactors.push({ level: "high", label: "Anggaran di bawah pasaran", detail: `Anggaran Rp ${job.budget.toLocaleString("id")} tergolong rendah. Kisaran pasar: Rp ${priceSuggestion.adjustedMin.toLocaleString("id")} – ${priceSuggestion.adjustedMax.toLocaleString("id")} per unit.` });
    }
    else if (job.budget < priceSuggestion.adjustedMid * 10) {
        riskScore += 10;
        riskFactors.push({ level: "medium", label: "Anggaran sedikit di bawah median", detail: "Anggaran bisa membatasi pilihan tenaga ahli terbaik." });
    }
    if (applications.length === 0 && job.status === "open") {
        riskScore += 25;
        riskFactors.push({ level: "high", label: "Belum ada pelamar", detail: "Proyek belum menarik minat. Pertimbangkan revisi deskripsi atau anggaran." });
    }
    else if (applications.length < 3 && job.status === "open") {
        riskScore += 10;
        riskFactors.push({ level: "medium", label: "Pelamar masih sedikit", detail: `Hanya ${applications.length} pelamar. Idealnya 5+ lamaran untuk lebih banyak pilihan.` });
    }
    if (job.deadline) {
        const daysLeft = Math.floor((new Date(job.deadline).getTime() - Date.now()) / 86400000);
        if (daysLeft < 7 && daysLeft >= 0 && job.status !== "completed") {
            riskScore += 30;
            riskFactors.push({ level: "high", label: "Deadline sangat dekat", detail: `Hanya ${daysLeft} hari tersisa sebelum deadline proyek.` });
        }
        else if (daysLeft < 0 && job.status !== "completed") {
            riskScore += 40;
            riskFactors.push({ level: "high", label: "Deadline terlewat", detail: `Proyek sudah melewati deadline ${Math.abs(daysLeft)} hari.` });
        }
        else if (daysLeft < 14 && job.status !== "completed") {
            riskScore += 15;
            riskFactors.push({ level: "medium", label: "Deadline dalam 2 minggu", detail: `${daysLeft} hari tersisa — pastikan progress sesuai rencana.` });
        }
    }
    else if (job.status === "open") {
        riskScore += 10;
        riskFactors.push({ level: "low", label: "Tidak ada deadline", detail: "Proyek tanpa deadline cenderung molor. Pertimbangkan set target penyelesaian." });
    }
    if (milestones.length > 0) {
        const overdue = milestones.filter((m) => m.dueDate && new Date(m.dueDate) < new Date() && m.status !== "approved");
        if (overdue.length > 0) {
            riskScore += overdue.length * 15;
            riskFactors.push({ level: "high", label: `${overdue.length} milestone terlambat`, detail: `Milestone "${overdue[0].title}" dan lainnya belum diselesaikan melewati due date.` });
        }
        const submittedMs = milestones.filter((m) => m.status === "submitted");
        if (submittedMs.length > 0) {
            riskScore += 5;
            riskFactors.push({ level: "medium", label: `${submittedMs.length} milestone menunggu persetujuan`, detail: "Segera tinjau dan setujui milestone agar pekerjaan tidak terhambat." });
        }
    }
    riskScore = Math.min(riskScore, 100);
    const milestoneSuggestions = MilestoneAgent.generateMilestones(job.category, job.budget);
    const totalEstDays = milestoneSuggestions.reduce((sum, m) => sum + m.estimatedDays, 0);
    const startDate = contract?.startDate ? new Date(contract.startDate) : new Date();
    const predictedEnd = new Date(startDate.getTime() + totalEstDays * 86400000);
    const actions = [];
    if (job.status === "open" && ranked.length > 0 && ranked[0].badge === "Top Pick") {
        actions.push({ priority: "urgent", icon: "⭐", title: `Terima lamaran dari ${ranked[0].applicantName}`, detail: `Skor kesesuaian ${ranked[0].totalScore}/100 — kandidat terbaik dari ${applications.length} pelamar.`, link: `/jobs/${jobId}` });
    }
    if (job.status === "open" && applications.length === 0) {
        actions.push({ priority: "urgent", icon: "📢", title: "Promosikan proyek Anda", detail: "Coba perbaiki deskripsi, naikkan anggaran, atau pertimbangkan tenaga ahli yang direkomendasikan AI.", link: `/jobs/${jobId}` });
    }
    if (contract && milestones.filter((m) => m.status === "submitted").length > 0) {
        actions.push({ priority: "urgent", icon: "✅", title: "Setujui milestone yang sudah dikerjakan", detail: "Milestone menunggu persetujuan Anda agar tukang dapat melanjutkan ke tahap berikutnya.", link: `/contracts/${contract.id}` });
    }
    if (!contract && job.status === "open" && matchedWorkers.length > 0) {
        actions.push({ priority: "recommended", icon: "🔍", title: "Lihat rekomendasi tukang terbaik", detail: `${matchedWorkers[0].workerName} sangat cocok (skor ${matchedWorkers[0].totalScore}/100). Lihat profil dan hubungi langsung.`, link: `/experts/${matchedWorkers[0].workerId}` });
    }
    if (job.status === "in_progress") {
        if (milestones.length === 0) {
            actions.push({ priority: "recommended", icon: "📋", title: "Tambahkan milestone pembayaran", detail: "Milestone melindungi kedua pihak — bayar sesuai progress kerja.", link: `/contracts/${contract?.id}` });
        }
    }
    if (riskScore > 50) {
        actions.push({ priority: "recommended", icon: "⚠️", title: "Tinjau faktor risiko proyek", detail: `Skor risiko ${riskScore}/100 — perlu perhatian lebih agar proyek berjalan lancar.` });
    }
    const completedMs = milestones.filter((m) => m.status === "approved").length;
    const progress = milestones.length > 0 ? Math.round((completedMs / milestones.length) * 100) : (job.status === "completed" ? 100 : job.status === "in_progress" ? 30 : 0);
    res.json({
        job,
        riskScore,
        riskLevel: riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low",
        riskFactors,
        applications: { total: applications.length, pending: applications.filter(a => a.status === "pending").length, accepted: applications.filter(a => a.status === "accepted").length },
        ranked: ranked.slice(0, 5),
        matchedWorkers: matchedWorkers.slice(0, 3),
        priceSuggestion,
        contract,
        milestones,
        progress,
        timeline: { estimatedDays: totalEstDays, predictedEndDate: predictedEnd.toISOString(), milestonePlan: milestoneSuggestions },
        actions,
        generatedAt: new Date().toISOString(),
    });
});
app.get("/api/agents/brain-contract/:contractId", requireAuth, async (req, res) => {
    const contractId = Number(req.params.contractId);
    const [contract, user] = await Promise.all([
        storage.getContractById(contractId),
        storage.getUserById(req.session.userId),
    ]);
    if (!contract)
        return res.status(404).json({ error: "Kontrak tidak ditemukan" });
    if (!user)
        return res.status(401).json({ error: "Unauthorized" });
    if (contract.clientId !== req.session.userId && contract.workerId !== req.session.userId && user.role !== "admin") {
        return res.status(403).json({ error: "Anda tidak memiliki akses ke supervisi kontrak ini" });
    }
    const result = await BrainContractOrchestrator.analyze(contractId);
    if (!result)
        return res.status(404).json({ error: "Gagal menganalisis kontrak" });
    res.json(result);
});
// ─── Klinika Teknis: Forum Q&A + Multi-Agent AI ──────────────────────────────
const klinikaQuestions = [...SEEDED_QUESTIONS];
let nextQId = klinikaQuestions.length + 1;
app.get("/api/klinika/questions", (_req, res) => {
    res.json({ questions: klinikaQuestions.map(q => ({ ...q, views: q.views + Math.floor(Math.random() * 5) })), total: klinikaQuestions.length });
});
app.post("/api/klinika/questions", (req, res) => {
    const { title, body, category } = req.body;
    if (!title || !body)
        return res.status(400).json({ error: "Judul dan body wajib diisi" });
    const result = orchestrateAnswer(title + " " + body);
    const newQ = {
        id: `uq${nextQId++}`,
        title, body, category: category || "Umum",
        tags: [category?.toLowerCase() || "konstruksi"],
        askedBy: req.session.userId ? "Pengguna Platform" : "Tamu",
        role: "Pelanggan",
        answered: true,
        views: 1,
        upvotes: 0,
        answers: [
            {
                id: `ua${Date.now()}`,
                body: result.primaryAnswer.answer,
                agentId: result.primaryAnswer.agentId,
                agentName: result.primaryAnswer.agentName,
                isAI: true,
                upvotes: 0,
            },
            ...result.supportingAnswers.map((sa, i) => ({
                id: `ua${Date.now()}-${i}`,
                body: sa.answer,
                agentId: sa.agentId,
                agentName: sa.agentName,
                isAI: true,
                upvotes: 0,
            })),
        ],
    };
    klinikaQuestions.unshift(newQ);
    res.json({ question: newQ });
});
app.post("/api/klinika/ask", (req, res) => {
    const { question } = req.body;
    if (!question)
        return res.status(400).json({ error: "Pertanyaan wajib diisi" });
    const result = orchestrateAnswer(question);
    res.json(result);
});
// ─── Bimtek & Pelatihan Teknis Konstruksi ────────────────────────────────────
const BIMTEK_COURSES = [
    { id: "bm-1", title: "Bimtek Penyusunan Perkiraan Biaya Konstruksi (AHSP) 2025", provider: "Dirjen Bina Konstruksi – Kementerian PUPR", category: "Estimasi & RAB", type: "hybrid", level: "menengah", duration: "3 Hari", durationHours: 24, price: 3500000, priceLabel: "Rp 3,5 jt/peserta", description: "Pelatihan penyusunan Analisa Harga Satuan Pekerjaan (AHSP) berdasarkan SE Dirjen Bina Konstruksi No. 30/SE/Dk/2025. Wajib bagi estimator, quantity surveyor, dan PPK proyek pemerintah.", topics: ["Dasar AHSP dan komponen biaya", "SE Dirjen Bina Konstruksi No. 30/2025", "Metodologi perhitungan upah, material, alat", "Penyusunan HSPK (Harga Satuan Pokok Kegiatan)", "Praktik langsung penyusunan AHSP", "Software estimasi RAB"], outcomes: ["Mampu menyusun AHSP sesuai regulasi terbaru", "Memahami komponen biaya konstruksi pemerintah", "Dapat memverifikasi RAB proyek pemerintah"], certification: true, certBody: "Sertifikat Dirjen Bina Konstruksi Kementerian PUPR", nextBatch: "Juli 2025", source: "Bimtekpemerintah.info", sourceUrl: "https://www.bimtekpemerintah.info/bimtek-biaya-konstruksi-pupr-2025/", rating: 4.7, participants: 1250, isFeatured: true, isGovernment: true, tags: ["ahsp", "rab", "biaya konstruksi", "pupr", "estimasi"] },
    { id: "bm-2", title: "Bimtek Pengadaan Barang dan Jasa Konstruksi (Perpres 12/2021)", provider: "LKPP & Dinas PU Daerah", category: "Hukum & Kontrak", type: "hybrid", level: "menengah", duration: "2 Hari", durationHours: 16, price: 2500000, priceLabel: "Rp 2,5 jt/peserta", description: "Bimbingan teknis pengadaan barang/jasa konstruksi sesuai Perpres 16/2018 jo. Perpres 12/2021.", topics: ["Regulasi pengadaan barang/jasa terbaru", "Metode pemilihan penyedia konstruksi", "Dokumen pemilihan dan kontrak", "Klausul kontrak konstruksi pemerintah", "Penyelesaian sengketa dan klaim", "SPSE & SiRUP sistem pengadaan online"], outcomes: ["Memahami regulasi pengadaan terkini", "Mampu menyusun dokumen lelang", "Dapat mengelola kontrak konstruksi pemerintah"], certification: true, certBody: "Sertifikat LKPP / Sertifikat Pengadaan Barang Jasa", nextBatch: "Agustus 2025", source: "Pusatedukasi.co.id", sourceUrl: "https://www.pusatedukasi.co.id/bimtek-pekerjaan-umum-2/", rating: 4.5, participants: 890, isFeatured: false, isGovernment: true, tags: ["pengadaan", "lelang", "kontrak pemerintah", "lkpp", "perpres"] },
    { id: "bm-3", title: "Pelatihan Ahli K3 Konstruksi (SKP Kemnaker)", provider: "Kemnaker RI – Pusat K3 Nasional", category: "K3 Konstruksi", type: "offline", level: "menengah", duration: "6 Hari", durationHours: 48, price: 7500000, priceLabel: "Rp 7,5 jt/peserta", description: "Program pelatihan dan sertifikasi Ahli Keselamatan & Kesehatan Kerja (K3) Konstruksi sesuai Permenaker.", topics: ["Dasar hukum K3 konstruksi Indonesia", "Identifikasi bahaya dan penilaian risiko (HIRARC)", "Job Safety Analysis (JSA)", "Sistem manajemen K3 (SMK3/ISO 45001)", "K3 pekerjaan di ketinggian, galian, perancah", "P3K dan prosedur darurat", "Audit K3 dan laporan kecelakaan kerja", "Praktik lapangan K3 konstruksi"], outcomes: ["Mendapatkan SKP Ahli K3 Konstruksi dari Kemnaker", "Mampu menyusun dokumen SMK3 proyek", "Dapat melakukan audit K3 di lapangan"], certification: true, certBody: "SKP Ahli K3 Konstruksi – Kementerian Ketenagakerjaan RI", nextBatch: "Juni 2025", source: "Kemnaker.go.id", sourceUrl: "https://kemnaker.go.id/", rating: 4.8, participants: 3200, isFeatured: true, isGovernment: true, tags: ["k3", "keselamatan kerja", "ahli k3", "kemnaker", "smk3"] },
    { id: "bm-4", title: "Masterclass BIM 5D — Autodesk Revit & Navisworks", provider: "BIM Konstruksi Indonesia (bimkonstruksi.com)", category: "BIM & Digital", type: "online", level: "menengah", duration: "30 Jam", durationHours: 30, price: 3200000, priceLabel: "Rp 3,2 jt/peserta", description: "Pelatihan Building Information Modelling (BIM) 5D menggunakan Autodesk Revit dan Navisworks.", topics: ["Konsep dan workflow BIM 5D", "Autodesk Revit Architecture & Structure", "Navisworks untuk clash detection", "4D simulasi construction sequence", "5D quantity take-off otomatis", "BIM execution plan (BEP)", "Kolaborasi multidisiplin via BIM 360"], outcomes: ["Menguasai Revit dan Navisworks level intermediate", "Mampu membuat model BIM 5D lengkap", "Dapat menyusun BIM Execution Plan (BEP)"], certification: true, certBody: "Sertifikat BIM Professional dari BIM Konstruksi + Autodesk Authorized", nextBatch: "Rolling (online self-paced)", source: "BIM Konstruksi", sourceUrl: "https://bimkonstruksi.com/", rating: 4.9, participants: 1800, isFeatured: true, isGovernment: false, tags: ["bim", "revit", "navisworks", "digital konstruksi", "autodesk"] },
    { id: "bm-5", title: "Training BIM untuk Arsitek & Insinyur 2025", provider: "Sainstara Training", category: "BIM & Digital", type: "hybrid", level: "pemula", duration: "16 Jam (2 Hari)", durationHours: 16, price: 2800000, priceLabel: "Rp 2,8 jt/peserta", description: "Training BIM dasar-menengah khusus arsitek dan insinyur sipil.", topics: ["Pengenalan BIM dan manfaatnya", "Revit fundamentals untuk arsitek/sipil", "Membuat model 3D bangunan", "Menghasilkan gambar 2D dari model 3D", "Schedule material dan quantity take-off", "Koordinasi multi-disiplin BIM"], outcomes: ["Memahami konsep BIM dan implementasinya", "Mampu mengoperasikan Autodesk Revit dasar-menengah", "Mampu membuat dokumen konstruksi dari model BIM"], certification: true, certBody: "Sertifikat Training BIM dari Sainstara + e-Certificate", nextBatch: "Setiap Bulan", source: "Sainstara Training", sourceUrl: "https://www.sainstaratraining.co.id/training-building-information-modeling-bim-untuk-arsitek-dan-insinyur-2025/", rating: 4.6, participants: 620, isFeatured: false, isGovernment: false, tags: ["bim", "revit", "arsitektur", "insinyur", "digital"] },
    { id: "bm-6", title: "Manajemen Proyek Konstruksi Profesional (PMI-PMBOK)", provider: "Bimteklatihnas", category: "Manajemen Proyek", type: "online", level: "menengah", duration: "4 Hari", durationHours: 32, price: 4500000, priceLabel: "Rp 4,5 jt/peserta", description: "Pelatihan manajemen proyek konstruksi mengacu standar PMI-PMBOK 7th Edition.", topics: ["Inisiasi proyek: charter dan stakeholder", "Perencanaan scope, WBS, dan schedule", "Network planning CPM dan Gantt Chart", "Earned Value Management (EVM)", "Manajemen risiko konstruksi", "Manajemen kualitas dan procurement", "Laporan progres dan kurva-S", "MS Project / Primavera P6 dasar"], outcomes: ["Memahami framework PMBOK untuk konstruksi", "Mampu membuat master schedule dan kurva-S", "Dapat melakukan monitoring dengan EVM"], certification: true, certBody: "Sertifikat Manajemen Proyek Konstruksi + persiapan ujian PMP", nextBatch: "Setiap 2 Minggu", source: "Bimteklatihnas", sourceUrl: "https://www.bimteklatihnas.com/training-building-information-modeling-bim-terpadu-2025/", rating: 4.7, participants: 980, isFeatured: true, isGovernment: false, tags: ["manajemen proyek", "pmbok", "pmp", "schedule", "earned value"] },
    { id: "bm-7", title: "Pelatihan Penyusunan RAB Konstruksi dengan Excel & Software", provider: "Platindo Pusat Pelatihan", category: "Estimasi & RAB", type: "hybrid", level: "pemula", duration: "2 Hari", durationHours: 16, price: 2200000, priceLabel: "Rp 2,2 jt/peserta", description: "Belajar menyusun Rencana Anggaran Biaya (RAB) konstruksi dari nol menggunakan Excel dan software RAB.", topics: ["Dasar-dasar RAB dan komponen biaya", "Quantity take-off dari gambar kerja", "Harga satuan pekerjaan (HSPK) 2025", "Format RAB yang benar (SNI/pemerintah)", "Menyusun BoQ (Bill of Quantities)", "Cash flow projection proyek", "Software RAB populer Indonesia"], outcomes: ["Mampu menyusun RAB dari gambar kerja", "Menguasai Excel untuk estimasi biaya", "Mendapat template RAB siap pakai"], certification: true, certBody: "Sertifikat Pelatihan RAB Konstruksi", nextBatch: "Setiap Minggu", source: "Platindo", sourceUrl: "https://www.pusdiklatplatindo.co.id/bimtek-penyusunan-ahsp-se-dirjen-bina-konstruksi-no-30-tahun-2025/", rating: 4.5, participants: 1420, isFeatured: false, isGovernment: false, tags: ["rab", "estimasi", "quantity takeoff", "excel", "boq"] },
    { id: "bm-8", title: "Teknisi Struktur Beton Bertulang — Desain & Pelaksanaan", provider: "Lembaga Pelatihan Konstruksi (LPK) Bina Konstruksi", category: "Struktur & Sipil", type: "offline", level: "menengah", duration: "5 Hari", durationHours: 40, price: 5000000, priceLabel: "Rp 5 jt/peserta", description: "Pelatihan teknis desain dan pelaksanaan struktur beton bertulang sesuai SNI 2847:2019.", topics: ["SNI 2847:2019 — Beton Struktural Gedung", "Analisis beban dan kombinasi beban gempa", "Desain kolom, balok, dan plat lantai", "Desain pondasi footplat dan tiang", "Detailing tulangan dan gambar kerja", "Metode pelaksanaan beton di lapangan", "Quality control pengecoran", "Praktik perhitungan dengan SAP2000 dasar"], outcomes: ["Mampu menghitung elemen struktur beton bertulang", "Memahami SNI 2847:2019 secara komprehensif", "Dapat membuat shop drawing struktur"], certification: true, certBody: "SKK (Surat Keterangan Kompetensi) Teknisi Struktur — BNSP Terakreditasi", nextBatch: "September 2025", source: "Pusdiklat Konstruksi PUPR", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", rating: 4.8, participants: 540, isFeatured: false, isGovernment: true, tags: ["struktur beton", "sni 2847", "tulangan", "kolom", "balok"] },
    { id: "bm-9", title: "Metode Pelaksanaan & Pengawasan Konstruksi Gedung", provider: "Institut Konstruksi Indonesia", category: "Struktur & Sipil", type: "hybrid", level: "menengah", duration: "3 Hari", durationHours: 24, price: 3800000, priceLabel: "Rp 3,8 jt/peserta", description: "Pelatihan metode pelaksanaan pekerjaan konstruksi gedung bertingkat.", topics: ["Pekerjaan tanah: galian, timbunan, kompaksi", "Metode pelaksanaan pondasi (tiang, footplat)", "Bekisting dan perancah sistem modern", "Pengecoran beton massal dan khusus", "Pekerjaan baja struktural dan baut", "Pengawasan kualitas dan inspeksi", "Laporan harian dan mingguan proyek", "Penggunaan drone & fotogrammetri untuk monitoring"], outcomes: ["Memahami seluruh tahapan konstruksi gedung", "Mampu membuat metode kerja (method statement)", "Dapat melakukan inspeksi dan QC lapangan"], certification: true, certBody: "Sertifikat Pelaksana Konstruksi — Institut Konstruksi Indonesia", nextBatch: "Oktober 2025", source: "Institut Konstruksi", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", rating: 4.6, participants: 380, isFeatured: false, isGovernment: false, tags: ["pelaksanaan konstruksi", "metode kerja", "pengawasan", "gedung bertingkat"] },
    { id: "bm-10", title: "Instalasi Listrik Bangunan Gedung (PUIL 2011)", provider: "PLN Persero & Kemnaker", category: "MEP", type: "hybrid", level: "menengah", duration: "4 Hari", durationHours: 32, price: 4200000, priceLabel: "Rp 4,2 jt/peserta", description: "Pelatihan instalasi listrik bangunan gedung sesuai PUIL 2011 (SNI 0225).", topics: ["PUIL 2011 — Persyaratan Umum Instalasi Listrik", "Single line diagram dan wiring diagram", "Perhitungan beban listrik dan pemilihan kabel", "Pemasangan MCB, panel, dan grounding", "Instalasi armatur dan stop kontak", "Instalasi di area basah dan berbahaya", "Testing dan commissioning", "Prosedur mendapatkan SLO dari PLN"], outcomes: ["Memahami PUIL 2011 secara komprehensif", "Mampu merancang instalasi listrik gedung", "Siap mengikuti ujian kompetensi instalatir PLN"], certification: true, certBody: "Sertifikat Kompetensi Instalatir PLN Kelas B (BNSP)", nextBatch: "Agustus 2025", source: "PLN / Kemnaker", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", rating: 4.7, participants: 2100, isFeatured: true, isGovernment: true, tags: ["listrik", "instalasi", "puil", "pln", "mep"] },
    { id: "bm-11", title: "Sistem Plambing Bangunan (SNI 8153:2015)", provider: "Himpunan Ahli Plumbing Indonesia (HAPSI)", category: "MEP", type: "offline", level: "menengah", duration: "3 Hari", durationHours: 24, price: 3600000, priceLabel: "Rp 3,6 jt/peserta", description: "Pelatihan desain dan instalasi sistem plambing bangunan sesuai SNI 8153:2015.", topics: ["SNI 8153:2015 Sistem Plambing", "Perancangan jaringan air bersih dan pompannya", "Sistem air buang dan vent pipe", "Tangki septik sesuai SNI 2398:2017", "Instalasi sprinkler pemadam kebakaran", "Pipa PPR, PVC, dan HDPE", "Pengujian dan komisioning plambing"], outcomes: ["Memahami standar plambing gedung Indonesia", "Mampu merancang sistem air bersih dan drainase", "Dapat melakukan inspeksi sistem plambing"], certification: true, certBody: "Sertifikat Ahli Plambing dari HAPSI", nextBatch: "November 2025", source: "HAPSI", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", rating: 4.5, participants: 320, isFeatured: false, isGovernment: false, tags: ["plambing", "air bersih", "sanitasi", "sni", "mep"] },
    { id: "bm-12", title: "SNI Konstruksi & Persyaratan Teknis Bangunan Gedung", provider: "BSN (Badan Standardisasi Nasional)", category: "SNI & Regulasi", type: "online", level: "semua", duration: "1 Hari (Webinar)", durationHours: 8, price: 0, priceLabel: "GRATIS (Webinar BSN)", description: "Webinar gratis tentang standar SNI konstruksi terkini.", topics: ["Update SNI konstruksi terbaru 2024-2025", "SNI 2847:2019 — Beton Struktural", "SNI 1726:2019 — Ketahanan Gempa", "SNI 7833:2012 — Perancangan Bangunan Baja", "PP 16/2021 — Bangunan Gedung (PBG/SLF)", "Standar aksesibilitas dan universal design"], outcomes: ["Memahami SNI konstruksi terbaru", "Mengetahui update regulasi PBG/SLF", "Dapat menerapkan SNI di proyek"], certification: false, nextBatch: "Setiap Bulan (cek bsn.go.id)", source: "BSN", sourceUrl: "https://bsn.go.id/", rating: 4.3, participants: 5800, isFeatured: false, isGovernment: true, tags: ["sni", "regulasi", "standar", "bsn", "gratis"] },
    { id: "bm-13", title: "Pelatihan Arsitek — Desain Rumah Hemat Energi & Hijau", provider: "Ikatan Arsitek Indonesia (IAI)", category: "Arsitektur", type: "hybrid", level: "menengah", duration: "2 Hari", durationHours: 16, price: 3000000, priceLabel: "Rp 3 jt/peserta", description: "Pelatihan desain bangunan hemat energi dan berkelanjutan sesuai SNI Bangunan Hijau.", topics: ["Konsep green building & EDGE certification", "Orientasi bangunan dan cross ventilation", "Sistem pencahayaan alami (daylighting)", "Material ramah lingkungan dan daur ulang", "Solar panel dan sistem energi terbarukan", "Perhitungan OTTV (Overall Thermal Transfer Value)", "Landscape dan urban heat island mitigation"], outcomes: ["Memahami konsep arsitektur hijau dan hemat energi", "Mampu mendesain bangunan dengan orientasi optimal", "Mengenal sistem sertifikasi EDGE/Greenship"], certification: true, certBody: "SKP (Satuan Kredit Profesi) IAI — 16 SKP", nextBatch: "Setiap Kuartal", source: "IAI", sourceUrl: "https://iai.or.id/", rating: 4.6, participants: 450, isFeatured: false, isGovernment: false, tags: ["arsitektur", "green building", "hemat energi", "iai", "desain"] },
    { id: "bm-14", title: "Sertifikasi Operator Alat Berat (Excavator/Loader) — BNSP", provider: "Pusdiklat Kemnaker + LSP Alat Berat", category: "Alat Berat", type: "offline", level: "pemula", duration: "5 Hari (Teori + Praktik)", durationHours: 40, price: 6000000, priceLabel: "Rp 6 jt/peserta", description: "Program pelatihan dan sertifikasi operator alat berat excavator dan wheel loader sesuai standar BNSP.", topics: ["Teori dasar hydraulic dan sistem alat berat", "Operasional excavator hidraulik 20-ton", "Operasional wheel loader 2-ton", "Perawatan harian alat berat (P2H)", "Keselamatan kerja operator alat berat", "Teknik gali, muat, dan pembuangan material", "Praktik lapangan 3 hari penuh", "Uji kompetensi BNSP"], outcomes: ["Mendapatkan SIO Kelas I/II dari Kemnaker", "Sertifikat Kompetensi BNSP Operator Alat Berat", "Siap bekerja di proyek pertambangan/konstruksi"], certification: true, certBody: "SIO Kemnaker + Sertifikat Kompetensi BNSP", nextBatch: "Setiap Bulan", source: "Kemnaker", sourceUrl: "https://kemnaker.go.id/", rating: 4.8, participants: 1670, isFeatured: true, isGovernment: true, tags: ["alat berat", "excavator", "operator", "sio", "bnsp"] },
    { id: "bm-15", title: "Pelatihan Waterproofing Profesional — Sika & Fosroc", provider: "PT Sika Indonesia (Sika Akademi)", category: "Struktur & Sipil", type: "hybrid", level: "pemula", duration: "1 Hari", durationHours: 8, price: 1500000, priceLabel: "Rp 1,5 jt/peserta", description: "Training aplikasi sistem waterproofing dari Sika: coating, crystalline, membrane, dan injection.", topics: ["Penyebab kebocoran dan analisis substrat", "Sistem Sika waterproofing coating (SikaTop, SikaFlex)", "Crystalline waterproofing (Xypex/Sika WT-200P)", "Membrane sheet untuk dak dan basement", "Injection grouting untuk retakan aktif", "Teknik preparasi substrat", "Praktik aplikasi di mock-up", "Estimasi kebutuhan material"], outcomes: ["Mampu mengaplikasikan sistem waterproofing Sika", "Dapat menjadi aplikator waterproofing bersertifikat", "Memahami teknik troubleshooting kebocoran"], certification: true, certBody: "Sertifikat Sika Authorized Applicator", nextBatch: "Setiap Bulan", source: "Sika Akademi", sourceUrl: "https://idn.sika.com/", rating: 4.7, participants: 890, isFeatured: false, isGovernment: false, tags: ["waterproofing", "sika", "bocor", "dak", "basement"] },
];
app.get("/api/bimtek", (_req, res) => {
    res.json({ courses: BIMTEK_COURSES, total: BIMTEK_COURSES.length });
});
// ─── External Jobs Board ────────────────────────────────────────────────────
const SEEDED_JOBS = [
    { id: "ext-1", title: "Pengawas Lapangan (Site Supervisor)", company: "PT Alam Sutera Realty Tbk", location: "Banten", type: "full_time", category: "Pengawasan", level: "Level 4-5", salaryMin: 5000000, salaryMax: 10000000, salaryLabel: "Rp 5 – 10 jt/bulan", description: "Memberikan support kepada tim konstruksi dalam mengawasi pekerjaan sipil, mekanikal, elektrikal.", requirements: ["SMK/D3 Teknik Sipil/Listrik", "Pengalaman 2+ tahun", "Bersedia ditempatkan site"], benefits: ["BPJS TK & Kes", "Tunjangan proyek", "Uang makan"], source: "Jooble", sourceUrl: "https://id.jooble.org/lowongan-kerja-konstruksi", postedAt: "2025-04-28", isVerified: true, isFeatured: true, workType: "Hybrid" },
    { id: "ext-2", title: "Pelaksana / Pengawas Lapangan", company: "Buana Tirta Pools", location: "Jakarta Barat", type: "full_time", category: "Pelaksana", level: "Level 4", salaryMin: 0, salaryMax: 0, salaryLabel: "Gaji Dirahasiakan", description: "Pelaksana dan pengawas lapangan untuk proyek konstruksi kolam renang dan bangunan.", requirements: ["SMK/D3/S1 Teknik Sipil", "Pengalaman 1-10 tahun", "Bisa AutoCAD"], benefits: ["BPJS", "Tunjangan transport", "Bonus proyek"], source: "Loker.id", sourceUrl: "https://www.loker.id/konstruksi-dan-bangunan/site-supervisor/pelaksana-pengawas-lapangan-buana-tirta-pools-jakarta-barat-25.html", postedAt: "2025-04-30", isVerified: true, isFeatured: true, workType: "Hybrid" },
    { id: "ext-3", title: "Site Supervisor Civil Work", company: "PT Mitra Purnama Engineering", location: "Jakarta", type: "full_time", category: "Supervisor", level: "Level 5", salaryMin: 6000000, salaryMax: 12000000, salaryLabel: "Rp 6 – 12 jt/bulan", description: "Mengawasi pekerjaan sipil di proyek konstruksi bangunan gedung.", requirements: ["S1 Teknik Sipil", "Pengalaman min. 3 tahun", "Sertifikat K3 diutamakan"], benefits: ["BPJS TK & Kes", "Tunjangan proyek", "Kendaraan dinas"], source: "Loker.id", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", postedAt: "2025-04-29", isVerified: true, isFeatured: false, workType: "Onsite" },
    { id: "ext-4", title: "Manager Konstruksi", company: "PT Konstruksi Andalan Nusantara", location: "Jakarta", type: "full_time", category: "Manajemen", level: "Level 7", salaryMin: 15000000, salaryMax: 25000000, salaryLabel: "Rp 15 – 25 jt/bulan", description: "Memimpin tim konstruksi gedung bertingkat.", requirements: ["S1/S2 Teknik Sipil/Arsitektur", "Pengalaman 7+ tahun", "SKA Madya/Utama"], benefits: ["Gaji kompetitif", "Mobil dinas", "BPJS", "Bonus tahunan"], source: "Indeed", sourceUrl: "https://id.indeed.com/q-proyek-konstruksi-lowongan.html", postedAt: "2025-04-27", isVerified: true, isFeatured: true, workType: "Hybrid" },
    { id: "ext-5", title: "Pengawas Lapangan Proyek Villa & Resort", company: "POSe", location: "Bali", type: "full_time", category: "Pengawasan", level: "Level 4", salaryMin: 5500000, salaryMax: 8000000, salaryLabel: "Rp 5,5 – 8 jt/bulan", description: "Mengawasi pelaksanaan pekerjaan sesuai master schedule.", requirements: ["SMK/D3 Teknik", "Pengalaman min. 2 tahun proyek villa/hotel", "Bersedia di-site"], benefits: ["Gaji + tunjangan site", "Akomodasi", "BPJS"], source: "Indeed", sourceUrl: "https://id.indeed.com/q-proyek-konstruksi-lowongan.html", postedAt: "2025-04-25", isVerified: true, isFeatured: false, workType: "Onsite" },
    { id: "ext-6", title: "Quality Control Inspector Bangunan", company: "PT Pembangunan Perumahan (PP)", location: "Jakarta Selatan", type: "kontrak", category: "QC/QA", level: "Level 5", salaryMin: 7000000, salaryMax: 11000000, salaryLabel: "Rp 7 – 11 jt/bulan", description: "Memeriksa kualitas pekerjaan konstruksi sesuai spesifikasi dan standar SNI.", requirements: ["S1 Teknik Sipil", "Pengalaman QC min. 3 tahun", "Familiar dengan SNI konstruksi"], benefits: ["BPJS TK & Kes", "Tunjangan site", "Asuransi kesehatan"], source: "Jobstreet", sourceUrl: "https://id.jobstreet.com/konstruksi-dan-bangunan-jobs", postedAt: "2025-04-26", isVerified: true, isFeatured: false, workType: "Onsite" },
    { id: "ext-7", title: "Drafter CAD/BIM Konstruksi", company: "PT Cipta Karya Mandiri", location: "Surabaya", type: "full_time", category: "Teknik", level: "Level 4", salaryMin: 4500000, salaryMax: 7000000, salaryLabel: "Rp 4,5 – 7 jt/bulan", description: "Membuat gambar teknis bangunan gedung menggunakan AutoCAD dan Revit BIM.", requirements: ["D3/S1 Teknik Sipil/Arsitektur", "Mahir AutoCAD & Revit", "Pengalaman 2+ tahun"], benefits: ["BPJS", "Tunjangan keahlian", "Pelatihan BIM"], source: "Loker.id", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", postedAt: "2025-04-24", isVerified: true, isFeatured: false, workType: "Onsite" },
    { id: "ext-8", title: "Site Engineer Struktur", company: "PT Waskita Karya (Persero) Tbk", location: "Bandung", type: "kontrak", category: "Engineering", level: "Level 6", salaryMin: 8000000, salaryMax: 14000000, salaryLabel: "Rp 8 – 14 jt/bulan", description: "Mengelola pekerjaan struktur di proyek gedung bertingkat.", requirements: ["S1 Teknik Sipil", "Pengalaman 4+ tahun struktur beton/baja", "SKT/SKA menjadi nilai lebih"], benefits: ["Gaji+tunjangan site", "BPJS", "Perjalanan dinas"], source: "Jobstreet", sourceUrl: "https://id.jobstreet.com/konstruksi-dan-bangunan-jobs", postedAt: "2025-04-23", isVerified: true, isFeatured: false, workType: "Onsite" },
    { id: "ext-9", title: "Estimator Biaya Konstruksi (RAB)", company: "CV Bangun Prima Jaya", location: "Medan", type: "full_time", category: "Estimasi", level: "Level 5", salaryMin: 5000000, salaryMax: 8500000, salaryLabel: "Rp 5 – 8,5 jt/bulan", description: "Menyusun Rencana Anggaran Biaya (RAB), analisa harga satuan, dan quantity take-off.", requirements: ["D3/S1 Teknik Sipil", "Pengalaman estimating 3+ tahun", "Menguasai Excel & software RAB"], benefits: ["Gaji + bonus proyek", "BPJS", "Tunjangan hari raya"], source: "Loker.id", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", postedAt: "2025-04-22", isVerified: false, isFeatured: false, workType: "Onsite" },
    { id: "ext-10", title: "Mekanikal Elektrikal Plumbing (MEP) Engineer", company: "PT Total Bangun Persada Tbk", location: "Jakarta Pusat", type: "full_time", category: "MEP", level: "Level 6", salaryMin: 9000000, salaryMax: 16000000, salaryLabel: "Rp 9 – 16 jt/bulan", description: "Merencanakan dan mengawasi sistem MEP pada proyek gedung komersial dan hotel.", requirements: ["S1 Teknik Mesin/Elektro", "Pengalaman MEP gedung 4+ tahun", "SKA Mekanikal/Elektrikal"], benefits: ["Paket remunerasi kompetitif", "BPJS + asuransi swasta", "Kendaraan dinas"], source: "Jobstreet", sourceUrl: "https://id.jobstreet.com/konstruksi-dan-bangunan-jobs", postedAt: "2025-04-21", isVerified: true, isFeatured: true, workType: "Hybrid" },
    { id: "ext-11", title: "Mandor Tukang Batu & Bata", company: "Proyek Perumahan Cluster Harmoni", location: "Depok", type: "harian", category: "Mandor", level: "Level 4", salaryMin: 200000, salaryMax: 300000, salaryLabel: "Rp 200 – 300 rb/hari", description: "Memimpin tim tukang batu 5-10 orang untuk pekerjaan pasangan bata, plesteran, dan acian di proyek perumahan.", requirements: ["Pengalaman mandor min. 3 tahun", "Bisa baca gambar kerja", "Punya tim tukang sendiri"], benefits: ["Bayar harian/mingguan", "Uang makan", "BPJS bila proyek >3 bulan"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-30", isVerified: false, isFeatured: true, workType: "Onsite" },
    { id: "ext-12", title: "Tukang Kayu — Kusen, Pintu & Plafon", company: "CV Griya Indah Furniture", location: "Yogyakarta", type: "harian", category: "Tukang Kayu", level: "Level 2-3", salaryMin: 130000, salaryMax: 200000, salaryLabel: "Rp 130 – 200 rb/hari", description: "Membuat dan memasang kusen, pintu, jendela, dan plafon kayu.", requirements: ["Pengalaman kayu min. 2 tahun", "Bisa membuat kusen & list profil"], benefits: ["Bayar harian", "Material disediakan", "Bonus selesai tepat waktu"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-29", isVerified: false, isFeatured: false, workType: "Onsite" },
    { id: "ext-13", title: "Tukang Las & Besi Konstruksi", company: "PT Baja Kokoh Sentosa", location: "Bekasi", type: "harian", category: "Las", level: "Level 3", salaryMin: 180000, salaryMax: 280000, salaryLabel: "Rp 180 – 280 rb/hari", description: "Mengelas dan memasang konstruksi baja untuk atap pabrik, gudang, dan bangunan komersial.", requirements: ["Sertifikat las (BNSP/Kemnaker)", "Pengalaman las baja konstruksi 2+ tahun", "Siap lembur"], benefits: ["Gaji harian + lembur", "Helm & APD disediakan", "BPJS proyek"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-28", isVerified: false, isFeatured: false, workType: "Onsite" },
    { id: "ext-14", title: "Teknisi Plumbing (Air Bersih & Kotor)", company: "CV Mitra Sanitasi", location: "Semarang", type: "harian", category: "Plambing", level: "Level 3", salaryMin: 150000, salaryMax: 220000, salaryLabel: "Rp 150 – 220 rb/hari", description: "Memasang instalasi pipa air bersih (PPRC) dan air buang (PVC) untuk proyek perumahan dan apartemen.", requirements: ["Pengalaman plumbing 2+ tahun", "Familiar pipa PPRC & PVC", "SKT Plambing diutamakan"], benefits: ["Bayar harian", "Material proyek disediakan"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-27", isVerified: false, isFeatured: false, workType: "Onsite" },
    { id: "ext-15", title: "Teknisi Listrik Bangunan (Instalatir)", company: "CV Listrik Aman Jaya", location: "Bandung", type: "harian", category: "Listrik", level: "Level 3-4", salaryMin: 160000, salaryMax: 250000, salaryLabel: "Rp 160 – 250 rb/hari", description: "Memasang instalasi listrik rumah tinggal dan gedung komersial sesuai PUIL 2011.", requirements: ["Sertifikat instalatir PLN", "Pengalaman 3+ tahun", "Bisa baca single line diagram"], benefits: ["Upah harian kompetitif", "Alat bantu disediakan"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-26", isVerified: false, isFeatured: false, workType: "Onsite" },
    { id: "ext-16", title: "Kontraktor Borongan — Renovasi Rumah", company: "Owner Pribadi (via KerjaProyek)", location: "Jakarta Selatan", type: "borongan", category: "Renovasi", level: "Level 3-5", salaryMin: 0, salaryMax: 0, salaryLabel: "Negosiasi per m²", description: "Dicari kontraktor borongan untuk renovasi rumah 2 lantai, 180m².", requirements: ["Pengalaman renovasi rumah 5+ tahun", "Tim lengkap (batu, kayu, cat)", "Berikan RAB detail"], benefits: ["Pembayaran per milestone", "Material owner supply", "DP 25% di muka"], source: "KerjaProyek", sourceUrl: "/jobs", postedAt: "2025-05-01", isVerified: true, isFeatured: true, workType: "Borongan" },
    { id: "ext-17", title: "Borongan Pemasangan Keramik Lantai & Dinding", company: "Developer Perumahan Griya Asri", location: "Tangerang", type: "borongan", category: "Lantai", level: "Level 2-3", salaryMin: 55000, salaryMax: 80000, salaryLabel: "Rp 55 – 80 rb/m²", description: "Pemasangan keramik lantai 40×40 dan dinding kamar mandi untuk 12 unit rumah tipe 36.", requirements: ["Pengalaman pasang keramik 3+ tahun", "Punya peralatan sendiri (tile cutter)", "Rapid kerja rapi"], benefits: ["Bayar per m² selesai", "Material disediakan developer", "Makan siang"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-30", isVerified: false, isFeatured: false, workType: "Borongan" },
    { id: "ext-18", title: "Freelance Pengecatan Eksterior & Interior", company: "Properti Milik Pribadi", location: "Surabaya", type: "borongan", category: "Pengecatan", level: "Level 2", salaryMin: 45000, salaryMax: 70000, salaryLabel: "Rp 45 – 70 rb/m²", description: "Pengecatan ulang rumah 2 lantai, eksterior dan interior. Total ±400m².", requirements: ["Pengalaman cat bangunan 2+ tahun", "Bisa alkali sealer & cat eksterior weather shield", "Peralatan sendiri"], benefits: ["Bayar setelah selesai per layer", "Scaffolding disediakan"], source: "OLX", sourceUrl: "https://www.olx.co.id/jasa-lowongan-kerja_c97/q-renovasi-rumah", postedAt: "2025-04-29", isVerified: false, isFeatured: false, workType: "Borongan" },
    { id: "ext-19", title: "Pasang Rangka Atap Baja Ringan (Borongan)", company: "Proyek Ruko 8 Unit", location: "Malang", type: "borongan", category: "Atap", level: "Level 3", salaryMin: 100000, salaryMax: 150000, salaryLabel: "Rp 100 – 150 rb/m²", description: "Pemasangan rangka baja ringan + genteng metal untuk 8 unit ruko 2 lantai.", requirements: ["Pengalaman atap baja ringan 3+ tahun", "Tim min. 4 orang", "Garansi kebocoran 1 tahun"], benefits: ["Bayar per progres", "Material rangka disediakan owner"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-28", isVerified: false, isFeatured: false, workType: "Borongan" },
    { id: "ext-20", title: "Tukang Bangunan Freelance — Proyek Kos-Kosan", company: "Investor Properti Kos", location: "Makassar", type: "borongan", category: "Konstruksi Baru", level: "Level 2-4", salaryMin: 3500000, salaryMax: 5000000, salaryLabel: "Rp 3,5 – 5 jt/bulan", description: "Membangun kos-kosan baru 2 lantai, 12 kamar, luas bangunan 250m².", requirements: ["Kontraktor berpengalaman bangun kos/kost", "Punya tim lengkap", "Bisa mulai Mei 2025"], benefits: ["DP 30% diawal", "Cicilan per milestone", "Bonus selesai tepat waktu"], source: "KerjaProyek", sourceUrl: "/jobs", postedAt: "2025-05-01", isVerified: true, isFeatured: true, workType: "Borongan" },
    { id: "ext-21", title: "Konsultan Pengawas Proyek (Part-time)", company: "PT Cipta Rancang Arsitektur", location: "Jakarta (Remote+Site)", type: "part_time", category: "Konsultan", level: "Level 7-8", salaryMin: 4000000, salaryMax: 8000000, salaryLabel: "Rp 4 – 8 jt/proyek", description: "Pengawas independen untuk proyek renovasi rumah premium.", requirements: ["S1/S2 Teknik Sipil/Arsitektur", "SKA Madya/Utama", "Pengalaman pengawas 7+ tahun"], benefits: ["Fee per proyek", "Fleksibel waktu", "Bisa multi-proyek"], source: "KerjaProyek", sourceUrl: "/jobs", postedAt: "2025-04-30", isVerified: true, isFeatured: false, workType: "Hybrid" },
    { id: "ext-22", title: "Operator Alat Berat (Excavator 20-ton)", company: "PT Adhi Karya (Persero) Tbk", location: "Kalimantan Timur", type: "kontrak", category: "Alat Berat", level: "Level 3", salaryMin: 6000000, salaryMax: 9000000, salaryLabel: "Rp 6 – 9 jt/bulan", description: "Mengoperasikan excavator untuk pekerjaan galian tanah, landscaping, dan land clearing.", requirements: ["SIO (Surat Izin Operasi) alat berat valid", "Pengalaman excavator 3+ tahun", "Siap penempatan luar Jawa"], benefits: ["Gaji + tunjangan lokasi", "Mess & makan", "BPJS TK & Kes"], source: "Jobstreet", sourceUrl: "https://id.jobstreet.com/konstruksi-dan-bangunan-jobs", postedAt: "2025-04-25", isVerified: true, isFeatured: false, workType: "Onsite" },
    { id: "ext-23", title: "Tukang Bata & Plesteran (Tim 3 Orang)", company: "Komplek Perumahan Griya Lestari", location: "Bogor", type: "borongan", category: "Tukang Batu", level: "Level 2-3", salaryMin: 90000, salaryMax: 130000, salaryLabel: "Rp 90 – 130 rb/m² (bata+plester)", description: "Pekerjaan pasang bata merah dan plesteran untuk 6 unit rumah tipe 45.", requirements: ["Pengalaman pasang bata & plester 3+ tahun", "Tim solid, konsisten hadir", "Rapi dan presisi"], benefits: ["Bayar per m² selesai tiap minggu", "Makan disediakan di site"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-29", isVerified: false, isFeatured: false, workType: "Borongan" },
    { id: "ext-24", title: "Ahli Waterproofing & Anti-Bocor", company: "Jasa Konstruksi Khusus Indonesia", location: "Jakarta (Multi-lokasi)", type: "part_time", category: "Waterproofing", level: "Level 3-4", salaryMin: 250000, salaryMax: 400000, salaryLabel: "Rp 250 – 400 rb/hari + komisi proyek", description: "Teknisi waterproofing berpengalaman untuk menangani kebocoran dak beton, kamar mandi, dan basement.", requirements: ["Sertifikat aplikator waterproofing", "Pengalaman 3+ tahun", "Punya alat torching sendiri"], benefits: ["Upah harian + komisi closing klien", "Alat chemical disediakan", "Bisa freelance sambil kerja tetap"], source: "OLX", sourceUrl: "https://www.olx.co.id/jasa-lowongan-kerja_c97/q-renovasi-rumah", postedAt: "2025-04-28", isVerified: false, isFeatured: false, workType: "Hybrid" },
    { id: "ext-25", title: "Kepala Tukang Finishing (Cat, Acian, Keramik)", company: "Kontraktor Perumahan Sentosa Group", location: "Bekasi", type: "harian", category: "Finishing", level: "Level 3-4", salaryMin: 180000, salaryMax: 280000, salaryLabel: "Rp 180 – 280 rb/hari", description: "Kepala tukang finishing memimpin tim 8-12 orang.", requirements: ["Pengalaman kepala tukang finishing 5+ tahun", "Punya tim sendiri", "Disiplin kualitas dan waktu"], benefits: ["Gaji harian + bonus kualitas", "BPJS bila kontrak >3 bulan", "Uang lembur"], source: "OLX", sourceUrl: "https://www.olx.co.id/lowongan_c226/q-bangunan", postedAt: "2025-04-27", isVerified: false, isFeatured: false, workType: "Onsite" },
];
let jobsCache = null;
let cacheTime = 0;
app.get("/api/external-jobs", async (req, res) => {
    const now = Date.now();
    if (jobsCache && now - cacheTime < 15 * 60 * 1000) {
        return res.json({ jobs: jobsCache, total: jobsCache.length, cached: true, scrapedAt: new Date(cacheTime).toISOString() });
    }
    let extraJobs = [];
    try {
        const response = await fetch("https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; KerjaProyekBot/1.0)" },
            signal: AbortSignal.timeout(5000),
        });
        const html = await response.text();
        const matches = [...html.matchAll(/<h2[^>]*>\s*<a[^>]*>([^<]{10,80})<\/a>/g)];
        for (const [, title] of matches.slice(0, 5)) {
            extraJobs.push({ id: `live-${Date.now()}-${Math.random()}`, title: title.trim(), company: "Live dari Loker.id", location: "Indonesia", type: "full_time", category: "Konstruksi", level: "Bervariasi", salaryMin: 0, salaryMax: 0, salaryLabel: "Lihat sumber", description: "Lowongan langsung dari Loker.id. Klik 'Lihat Detail' untuk info lengkap.", requirements: [], benefits: [], source: "Loker.id (Live)", sourceUrl: "https://www.loker.id/lowongan-kerja/konstruksi-dan-bangunan", postedAt: new Date().toISOString().slice(0, 10), isVerified: false, isFeatured: false, workType: "Bervariasi" });
        }
    }
    catch (_) { /* Scraping gagal, gunakan data seed */ }
    const allJobs = [...SEEDED_JOBS, ...extraJobs];
    jobsCache = allJobs;
    cacheTime = now;
    res.json({ jobs: allJobs, total: allJobs.length, cached: false, scrapedAt: new Date().toISOString() });
});
// Upah standar referensi
app.get("/api/salary-reference", (_req, res) => {
    res.json({
        updatedAt: "2025",
        source: "99.co & Cermati (2025)",
        harian: [
            { position: "Kepala Tukang Cat", rate: 150750, unit: "orang/hari" },
            { position: "Tukang Cat Terampil", rate: 70750, unit: "orang/hari" },
            { position: "Tukang Cat Setengah Terampil", rate: 60750, unit: "orang/hari" },
            { position: "Kepala Tukang Kayu", rate: 150750, unit: "orang/hari" },
            { position: "Tukang Kayu", rate: 130750, unit: "orang/hari" },
            { position: "Tukang Kayu Setengah Terampil", rate: 90750, unit: "orang/hari" },
            { position: "Kepala Tukang Batu", rate: 150750, unit: "orang/hari" },
            { position: "Tukang Batu", rate: 120750, unit: "orang/hari" },
            { position: "Tukang Batu Setengah Terampil", rate: 90750, unit: "orang/hari" },
            { position: "Kepala Tukang Besi/Pembesian", rate: 150750, unit: "orang/hari" },
            { position: "Tukang Besi/Pembesian", rate: 120750, unit: "orang/hari" },
            { position: "Kepala Tukang Las", rate: 170000, unit: "orang/hari" },
            { position: "Tukang Las Terampil", rate: 140000, unit: "orang/hari" },
            { position: "Kepala Tukang Listrik", rate: 170000, unit: "orang/hari" },
            { position: "Tukang Listrik Terampil", rate: 130000, unit: "orang/hari" },
            { position: "Kepala Tukang Plambing", rate: 160000, unit: "orang/hari" },
            { position: "Tukang Plambing", rate: 125000, unit: "orang/hari" },
            { position: "Mandor (Kepala Pelaksana)", rate: 200000, unit: "orang/hari" },
            { position: "Pekerja Pembantu (Helper)", rate: 80000, unit: "orang/hari" },
        ],
        borongan: [
            { pekerjaan: "Pondasi Batu Kali", rate: 2000000, unit: "per m³", range: "1,8 – 2,5 jt" },
            { pekerjaan: "Pasang Bata Merah", rate: 95000, unit: "per m²", range: "80 – 120 rb" },
            { pekerjaan: "Plesteran", rate: 45000, unit: "per m²", range: "35 – 60 rb" },
            { pekerjaan: "Acian", rate: 35000, unit: "per m²", range: "25 – 45 rb" },
            { pekerjaan: "Pasang Keramik Lantai", rate: 65000, unit: "per m²", range: "50 – 90 rb" },
            { pekerjaan: "Pengecatan Dinding", rate: 55000, unit: "per m²", range: "40 – 70 rb" },
            { pekerjaan: "Rangka Atap Baja Ringan", rate: 135000, unit: "per m²", range: "100 – 180 rb" },
            { pekerjaan: "Pasang Genteng", rate: 45000, unit: "per m²", range: "35 – 60 rb" },
            { pekerjaan: "Pasang Keramik Dinding", rate: 75000, unit: "per m²", range: "60 – 100 rb" },
            { pekerjaan: "Waterproofing Coating", rate: 85000, unit: "per m²", range: "65 – 120 rb" },
            { pekerjaan: "Bekisting Kolom/Balok", rate: 95000, unit: "per m²", range: "75 – 130 rb" },
            { pekerjaan: "Pembesian Kolom/Balok", rate: 18000, unit: "per kg besi", range: "15 – 25 rb" },
        ],
    });
});
// Serve React frontend when dist/public exists
if (isProd) {
    app.use(express.static(publicDir));
    app.get("*", (_req, res) => {
        res.sendFile(path.join(publicDir, "index.html"));
    });
}
// ─── Global error handler ─────────────────────────────────────────────────────
// Must be registered after all routes. Catches errors forwarded via next(err),
// including DB connection failures propagated by the asyncHandler wrapper above.
app.use((err, _req, res, _next) => {
    console.error("[server] unhandled error:", err);
    const status = typeof err.status === "number" ? err.status : 500;
    res.status(status).json({ error: "Service temporarily unavailable" });
});
export { app };
