# KerjaProyek

Marketplace konstruksi Indonesia — menghubungkan owner/boher dengan tukang, mandor, dan tenaga ahli SKK jenjang 1–9 untuk pekerjaan harian maupun borongan.

## Stack Teknologi

- **Frontend**: React + Vite (port 5000), TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing), React Query
- **Backend**: Express.js (port 3000, bind 0.0.0.0), TypeScript, express-session
- **Storage**: In-memory (seeded data, reset saat restart)
- **Shared**: `shared/types.ts` (TypeScript types)
- **Konstanta Frontend**: `client/src/lib/constants.ts` (JOB_CATEGORIES, SKILLS_LIST, KKNI_LEVELS)

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Pelanggan/Owner | budi@example.com | password123 |
| Tukang | ahmad@example.com | password123 |
| Admin | admin@kerjaproyek.id | admin123 |

## Struktur Direktori

```
├── client/
│   └── src/
│       ├── App.tsx                    # Routes (Wouter)
│       ├── components/
│       │   ├── ui/                    # shadcn/ui components
│       │   ├── Navbar.tsx
│       │   ├── Footer.tsx
│       │   ├── AgentInsightsPanel.tsx     # Dashboard smart insights widget
│       │   ├── AgentMatchPanel.tsx        # Job detail: rekomendasi pekerja AI
│       │   ├── AgentRankPanel.tsx         # Job detail: ranking lamaran AI
│       │   ├── PriceSuggestWidget.tsx     # Job create: saran harga pasar
│       │   └── MilestoneGeneratorWidget.tsx # Contract: auto-generate milestone
│       ├── hooks/
│       │   ├── useUser.ts
│       │   ├── useJobs.ts
│       │   ├── useExperts.ts
│       │   └── useAgents.ts              # Semua hooks agent API
│       ├── lib/
│       │   ├── queryClient.ts
│       │   ├── utils.ts
│       │   └── constants.ts
│       └── pages/
│           ├── Home.tsx               # Landing page dengan AI Tools showcase
│           ├── Dashboard.tsx          # Role-specific dashboard dengan integrated tools
│           ├── Jobs.tsx               # Proyek marketplace dengan AI match score
│           ├── JobCreate.tsx
│           ├── JobDetail.tsx
│           ├── Experts.tsx            # Tenaga ahli dengan KKNI badge & quick filter
│           ├── ExpertDetail.tsx       # Trust score, portfolio, certifications
│           ├── Contracts.tsx
│           ├── ContractDetail.tsx
│           ├── BrainProject.tsx       # 5-agen supervisi kontrak aktif
│           ├── BrainContract.tsx      # Brain project per kontrak
│           ├── Klinika.tsx            # Forum + 6-agen AI technical Q&A
│           ├── Bimtek.tsx             # 15 program pelatihan PUPR/Kemnaker/BNSP
│           ├── JobBoard.tsx           # Lowongan eksternal (Loker.id, Jobstreet, OLX)
│           ├── CostEstimator.tsx      # Kalkulator RAB SNI 2025 + AHSP
│           ├── CompetencyTest.tsx     # Simulasi uji kompetensi SKKNI
│           ├── StudyMaterials.tsx     # Materi teknis konstruksi
│           ├── Chatbot.tsx            # AI chatbot multi-agen + knowledge base
│           ├── Disputes.tsx
│           ├── Portfolio.tsx
│           ├── ProfileEdit.tsx
│           ├── Onboarding.tsx
│           ├── MyJobs.tsx
│           ├── Auth.tsx
│           └── Admin.tsx
├── server/
│   ├── index.ts              # Express backend, semua API routes
│   ├── storage.ts            # In-memory storage + seeded data
│   ├── agents.ts             # Sistem multi-agen (4 agen bisnis rule-based)
│   └── constructionQA.ts     # 6 agen spesialis konstruksi AI + orchestrator
├── shared/
│   └── types.ts
├── vite.config.ts            # proxy /api → 127.0.0.1:3000
└── package.json
```

## Sistem Multi-Agen Konstruksi

### Agen Bisnis (server/agents.ts)

#### 1. MatchingAgent — `GET /api/agents/match/:jobId`
Mencocokkan proyek dengan pekerja terbaik:
- Keahlian (0-40pt) · Lokasi (0-20pt) · Level SKK (0-15pt) · Rating (0-15pt) · Pengalaman (0-10pt)
- Skor dikurangi 30% jika pekerja sedang aktif di kontrak lain

#### 2. PricingAgent — `POST /api/agents/price-suggest`
Saran harga pasar:
- Tabel harga dasar per kategori (16 kategori)
- Indeks biaya lokasi (Jakarta 135%, Bali 120%, dst.)

#### 3. MilestoneAgent — `POST /api/agents/milestones`
Auto-generate milestone pembayaran:
- Template 5 kategori (Renovasi, Konstruksi Baru, Pengecatan, Listrik, Pondasi)
- Perhitungan persentase, nominal, dan tanggal jatuh tempo otomatis

#### 4. ApplicationRankingAgent — `GET /api/agents/rank-applications/:jobId`
Meranking lamaran: Rating (30pt) · Pengalaman (20pt) · Harga (20pt) · SKK (15pt) · Verifikasi (15pt)
- Badge: "Top Pick" (≥70), "Good Match" (≥50), "Consider" (≥30)

#### 5. AgentOrchestrator — `GET /api/agents/insights`
Dashboard insights kontekstual berdasarkan peran pengguna

#### 6. BrainContractOrchestrator — `GET /api/agents/brain-project/:jobId`
Supervisi kontrak aktif real-time (skor 0-100):
- Contract Compliance · Construction Sequence · Budget Health · Progress Monitor · Field Quality

### Agen Teknis (server/constructionQA.ts)

6 agen AI spesialis konstruksi Indonesia:
| Agen | Domain | Referensi |
|------|--------|-----------|
| 🏗️ Struktur | Beton, baja, fondasi | SNI 2847, SNI 1726, SNI 1727 |
| 📐 Arsitektur | Desain, PBG/IMB, ruang | PP 16/2021, KDB, KLB |
| ⚡ MEP | Listrik, plambing, HVAC | PUIL 2011, SNI 7065 |
| ⛑️ K3 | Keselamatan, APD, JSA | PP 50/2012, Permenaker K3 |
| 📊 Manajemen | RAB, schedule, kontrak | PMBOK, Permen PUPR |
| 🧱 Material | Material, SNI, harga | SNI 15-2049, SNI 07-2052 |

**Orchestrator**: `POST /api/klinika/ask` — auto-routing ke agen paling relevan, + supporting answers dari agen lain + related questions

## API Endpoints

### Auth
- `POST /api/login` · `POST /api/register` · `POST /api/logout` · `GET /api/user`

### Jobs & Applications
- `GET/POST /api/jobs` · `GET/PUT /api/jobs/:id`
- `GET/POST /api/jobs/:id/applications` · `POST /api/jobs/:id/apply`
- `POST /api/jobs/:jobId/applications/:appId/accept` — auto-buat kontrak + milestone

### Contracts & Milestones
- `GET/POST /api/contracts` · `GET/PUT /api/contracts/:id`
- `POST /api/contracts/:id/sign` · `POST /api/contracts/:id/complete`
- `POST /api/milestones/:id/submit` · `POST /api/milestones/:id/approve`

### Experts & Profiles
- `GET /api/experts` · `GET /api/experts/:userId`
- `GET/PUT /api/profile` · `GET/POST /api/portfolio`
- `GET/POST /api/reviews/:userId`

### Tools & AI
- `GET /api/agents/match/:jobId` — AI worker matching
- `POST /api/agents/price-suggest` — saran harga pasar
- `POST /api/agents/milestones` — auto-generate milestone
- `GET /api/agents/rank-applications/:jobId` — ranking lamaran AI
- `GET /api/agents/insights` — dashboard insights AI
- `GET /api/agents/brain-project/:jobId` — brain project supervisi
- `POST /api/klinika/ask` — 6-agen technical Q&A
- `GET/POST /api/klinika/questions` — forum questions
- `GET /api/bimtek` — 15 program pelatihan
- `GET /api/external-jobs` — job board (Loker.id, Jobstreet, OLX + scraping)
- `GET /api/salary-reference` — referensi upah AHSP
- `POST /api/cost-estimate` — kalkulator RAB
- `GET /api/dashboard/milestones` — milestone aktif semua kontrak

### Admin
- `GET /api/admin/status` · `GET /api/admin/profiles`
- `POST /api/admin/verify/:id` · `GET /api/analytics/summary`

## Integrasi Fitur di Frontend

| Halaman | Fitur AI/Integrasi |
|---------|-------------------|
| Dashboard (owner) | AgentInsightsPanel · QuickCostEstimator · ExpertRecommendation · BrainProject scores |
| Dashboard (tukang) | AgentInsightsPanel · ProfileCompleteness · JobMatch% · BimtekRecommendation |
| Jobs | Smart match score per job (tukang) · Brain AI shortcut (owner) · Sort by match |
| Experts | Quick skill filter pills · KKNI color badges · AI Matching aktif · Sort options |
| Job Detail | AgentMatchPanel · AgentRankPanel · PriceSuggestWidget |
| Klinika | 6-agen AI forum · Live ask AI · Category filter · Supporting answers · References |
| Chatbot | Multi-agent for technical questions · KB for general · Agent badges · Related questions |
| Bimtek | 15 program PUPR/Kemnaker/BNSP · Filter kategori/level/tipe · Expand detail |
| JobBoard | 25+ lowongan Loker.id/Jobstreet/OLX · Live scraping · Salary reference |
| CostEstimator | RAB kalkulator SNI · AHSP per kota · Material breakdown · Timeline estimate |
| CompetencyTest | Simulasi uji SKKNI per level KKNI |
| StudyMaterials | Materi teknis K3, Struktur, SNI, dll |
| BrainProject | 5-agen supervisi skor 0-100 · Faktor risiko · Action items |
| ContractDetail | Complete contract · Review dialog · Milestone 5-state · Payment summary |

## Alur Kerja Kritis

### Accept Application → Auto Contract
`POST /api/jobs/:jobId/applications/:appId/accept`
1. Terima lamaran terpilih, tolak semua lainnya + notifikasi
2. Update job status → `in_progress` + set `workerId`
3. Auto-buat contract (`status: active`, `clientSigned: true`)
4. Auto-generate milestone via `MilestoneAgent.generateMilestones()`
5. Kirim notifikasi ke klien dan tukang
6. Return `{ contract, milestonesCreated }` → redirect ke halaman kontrak

### Complete Contract → Update Stats
`POST /api/contracts/:id/complete`
1. Validasi semua milestone sudah approved
2. Update contract `status: completed`, job `status: completed`
3. Update `workerProfile.completedProjects + 1`
4. Notifikasi tukang (selesai) + klien (review reminder)

## Catatan Penting

- Vite proxy HARUS target `http://127.0.0.1:3000` (bukan localhost) — hindari ECONNREFUSED
- Express HARUS listen di `0.0.0.0:3000`
- `SelectItem` dari Radix UI tidak bisa value="" — gunakan value="all"
- Konstanta (JOB_CATEGORIES, SKILLS_LIST, KKNI_LEVELS) ada di `client/src/lib/constants.ts`
- Tidak ada hook `useProfiles` — gunakan `useExperts()` dari `@/hooks/useExperts`
- Agen berjalan sepenuhnya server-side, tidak butuh API eksternal
- Storage in-memory: reset saat restart server; data demo di-seed otomatis di storage.ts
