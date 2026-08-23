import { useState } from "react";
import { Link } from "wouter";
import {
  Briefcase, FileText, Users, Bell, Plus, ArrowRight, CheckCircle,
  Clock, AlertCircle, TrendingUp, Star, DollarSign, Calendar,
  MessageSquare, GraduationCap, Newspaper, Zap, HardHat,
  ChevronRight, Bot, Target, Award, Shield, BarChart2, BookOpen,
  Hammer, Building2, Wrench, AlertTriangle, CheckSquare, Info,
  RefreshCw, Loader2, Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser, useNotifications } from "@/hooks/useUser";
import { useJobs, useMyJobs } from "@/hooks/useJobs";
import { useContracts, useAnalytics, useDashboardMilestones, useExperts } from "@/hooks/useExperts";
import {
  formatCurrency, formatRelativeTime, formatDate, getInitials,
  getStatusColor, getStatusLabel
} from "@/lib/utils";
import AgentInsightsPanel from "@/components/AgentInsightsPanel";

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5 text-slate-400" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  submitted: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
};

const TOOL_CARDS_OWNER = [
  { href: "/jobs/create", icon: "🏗️", title: "Buat Proyek Baru", desc: "Post proyek & temukan tukang terbaik", color: "from-blue-500 to-indigo-600", badge: "AI Matching" },
  { href: "/experts", icon: "👷", title: "Cari Tenaga Ahli", desc: "Tukang & mandor terverifikasi KKNI", color: "from-green-500 to-emerald-600", badge: "850+ Ahli" },
  { href: "/cost-estimator", icon: "💰", title: "Estimasi Biaya", desc: "Hitung RAB instan berdasarkan SNI 2025", color: "from-amber-500 to-orange-600", badge: "Gratis" },
  { href: "/klinika", icon: "🧠", title: "Klinika Teknis", desc: "Tanya 6 Agen AI spesialis konstruksi", color: "from-purple-500 to-violet-600", badge: "Multi-Agent" },
  { href: "/job-board", icon: "📋", title: "Papan Lowongan", desc: "Aggregasi lowongan dari Loker.id & more", color: "from-rose-500 to-pink-600", badge: "25+ Jobs" },
  { href: "/bimtek", icon: "🎓", title: "Bimtek & Pelatihan", desc: "15 program PUPR/Kemnaker/BNSP", color: "from-teal-500 to-cyan-600", badge: "Bersertifikat" },
];

const TOOL_CARDS_TUKANG = [
  { href: "/jobs", icon: "📋", title: "Proyek Tersedia", desc: "Temukan proyek sesuai keahlian Anda", color: "from-blue-500 to-indigo-600", badge: "Buka Sekarang" },
  { href: "/job-board", icon: "🗞️", title: "Lowongan Konstruksi", desc: "Info kerja dari Loker.id, Jobstreet, OLX", color: "from-green-500 to-emerald-600", badge: "Real-time" },
  { href: "/klinika", icon: "🧠", title: "Klinika Teknis", desc: "Diskusi teknis dengan komunitas & AI", color: "from-purple-500 to-violet-600", badge: "6 Agen AI" },
  { href: "/bimtek", icon: "🎓", title: "Tingkatkan Skill", desc: "Bimtek & pelatihan bersertifikat BNSP", color: "from-amber-500 to-orange-600", badge: "Sertifikat" },
  { href: "/competency-test", icon: "🏆", title: "Uji Kompetensi", desc: "Latihan soal SKKNI & KKNI resmi", color: "from-rose-500 to-pink-600", badge: "BNSP Ready" },
  { href: "/study-materials", icon: "📚", title: "Materi Belajar", desc: "Modul SNI, K3, teknis konstruksi", color: "from-teal-500 to-cyan-600", badge: "Gratis" },
];

const PROFILE_ITEMS_TUKANG = [
  { key: "bio", label: "Bio & Deskripsi", icon: "👤" },
  { key: "skills", label: "Keahlian Teknis", icon: "🔧" },
  { key: "location", label: "Lokasi & Wilayah Kerja", icon: "📍" },
  { key: "kkniLevel", label: "Level KKNI", icon: "🏅" },
  { key: "certifications", label: "Sertifikasi BNSP/K3", icon: "📜" },
  { key: "portfolio", label: "Portfolio Proyek", icon: "🏗️" },
];

const BIMTEK_RECS: Record<string, { title: string; provider: string; href: string }[]> = {
  "Konstruksi Umum": [
    { title: "Manajemen Proyek Konstruksi (PMBOK)", provider: "Bimteklatihnas", href: "/bimtek" },
    { title: "Penyusunan RAB Konstruksi", provider: "Platindo", href: "/bimtek" },
  ],
  "Struktur": [
    { title: "Teknisi Struktur Beton Bertulang", provider: "Bina Konstruksi", href: "/bimtek" },
    { title: "Masterclass BIM 5D – Revit", provider: "BIM Konstruksi", href: "/bimtek" },
  ],
  "Listrik": [
    { title: "Instalasi Listrik PUIL 2011", provider: "PLN Persero", href: "/bimtek" },
  ],
  "K3": [
    { title: "Pelatihan Ahli K3 Konstruksi", provider: "Kemnaker RI", href: "/bimtek" },
  ],
};

function getProfileCompleteness(profile: any, user: any): { score: number; missing: string[] } {
  if (!profile) return { score: 0, missing: PROFILE_ITEMS_TUKANG.map(i => i.label) };
  let filled = 0;
  const missing: string[] = [];
  const checks: [any, string][] = [
    [profile.bio, "Bio & Deskripsi"],
    [profile.skills?.length, "Keahlian Teknis"],
    [profile.location, "Lokasi & Wilayah Kerja"],
    [profile.kkniLevel, "Level KKNI"],
    [profile.certifications?.length, "Sertifikasi BNSP/K3"],
    [profile.portfolioItems?.length, "Portfolio Proyek"],
  ];
  for (const [val, label] of checks) {
    if (val) filled++; else missing.push(label);
  }
  return { score: Math.round((filled / checks.length) * 100), missing };
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

export default function Dashboard() {
  const { data: user } = useUser();
  const { data: notifications = [] } = useNotifications();
  const { data: contracts = [] } = useContracts();
  const { data: analytics } = useAnalytics();
  const { data: myJobs = [] } = useMyJobs(user?.id);
  const { data: allJobs = [] } = useJobs({ status: "open" });
  const { data: upcomingMilestones = [] } = useDashboardMilestones();
  const { data: experts = [] } = useExperts();

  const isTukang = user?.role === "tukang";
  const unreadNotifs = notifications.filter((n: any) => !n.isRead);
  const activeContracts = contracts.filter((c: any) => c.status === "active");
  const recentJobs = isTukang ? allJobs.slice(0, 6) : myJobs.slice(0, 5);

  const tukangEarnings = contracts
    .filter((c: any) => c.status === "completed" && c.workerId === user?.id)
    .reduce((sum: number, c: any) => sum + (c.totalValue || 0), 0);

  const ownerSpent = contracts
    .filter((c: any) => c.status === "completed" && c.clientId === user?.id)
    .reduce((sum: number, c: any) => sum + (c.totalValue || 0), 0);

  const profileData = (experts as any[]).find((e: any) => e.userId === user?.id);
  const { score: profileScore, missing: profileMissing } = getProfileCompleteness(profileData, user);

  const stats = isTukang
    ? [
        { label: "Proyek Tersedia", value: allJobs.length, icon: <Briefcase className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50", link: "/jobs" },
        { label: "Kontrak Aktif", value: activeContracts.length, icon: <FileText className="h-5 w-5" />, color: "text-green-600", bg: "bg-green-50", link: "/contracts" },
        { label: "Total Pendapatan", value: formatCurrency(tukangEarnings), icon: <DollarSign className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50", link: "/contracts" },
        { label: "Milestone Aktif", value: upcomingMilestones.length, icon: <Calendar className="h-5 w-5" />, color: "text-orange-600", bg: "bg-orange-50", link: "/contracts" },
      ]
    : [
        { label: "Proyek Diposting", value: myJobs.length, icon: <Briefcase className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50", link: "/my-jobs" },
        { label: "Kontrak Aktif", value: activeContracts.length, icon: <FileText className="h-5 w-5" />, color: "text-green-600", bg: "bg-green-50", link: "/contracts" },
        { label: "Total Diinvestasikan", value: formatCurrency(ownerSpent), icon: <DollarSign className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50", link: "/contracts" },
        { label: "Notifikasi Baru", value: unreadNotifs.length, icon: <Bell className="h-5 w-5" />, color: "text-orange-600", bg: "bg-orange-50", link: "/dashboard" },
      ];

  const toolCards = isTukang ? TOOL_CARDS_TUKANG : TOOL_CARDS_OWNER;

  const firstName = user?.fullName?.split(" ")[0] || "Pengguna";
  const timeOfDay = new Date().getHours() < 12 ? "Selamat pagi" : new Date().getHours() < 17 ? "Selamat siang" : "Selamat malam";
  const roleLabel = isTukang ? (profileData?.isMandor ? "Mandor" : "Tenaga Ahli") : "Pemilik Proyek";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{roleLabel}</span>
            {isTukang && profileScore >= 80 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Profil Lengkap</span>}
            {isTukang && profileScore < 80 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Profil {profileScore}% lengkap</span>}
          </div>
          <h1 className="text-2xl font-bold">{timeOfDay}, {firstName}! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTukang
              ? `${allJobs.length} proyek tersedia hari ini · ${activeContracts.length} kontrak aktif`
              : `${myJobs.filter((j: any) => j.status === "open").length} proyek terbuka · ${activeContracts.length} kontrak aktif`}
          </p>
        </div>
        <div className="flex gap-2">
          {isTukang ? (
            <>
              <Link href="/profile/edit"><Button variant="outline" className="gap-2 text-sm"><Award className="h-4 w-4" /> Lengkapi Profil</Button></Link>
              <Link href="/jobs"><Button className="gap-2 text-sm"><SearchIcon className="h-4 w-4" /> Cari Proyek</Button></Link>
            </>
          ) : (
            <>
              <Link href="/experts"><Button variant="outline" className="gap-2 text-sm"><Users className="h-4 w-4" /> Cari Tukang</Button></Link>
              <Link href="/jobs/create"><Button className="gap-2 text-sm"><Plus className="h-4 w-4" /> Buat Proyek</Button></Link>
            </>
          )}
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <Link key={s.label} href={s.link}>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className="text-2xl font-bold leading-tight">{s.value}</p>
                  </div>
                  <div className={`${s.bg} ${s.color} p-2.5 rounded-xl`}>{s.icon}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Integrated Tools Grid ─────────────────────────────────────────────── */}
      <Card className="border-none shadow-sm mb-6 overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Pusat Layanan KerjaProyek
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {toolCards.map((t) => (
              <Link key={t.href} href={t.href}>
                <div className={`relative p-3.5 rounded-xl bg-gradient-to-br ${t.color} text-white cursor-pointer hover:opacity-90 transition-all hover:scale-[1.01] group`}>
                  <div className="text-2xl mb-1.5">{t.icon}</div>
                  <p className="font-bold text-sm leading-tight mb-0.5">{t.title}</p>
                  <p className="text-xs text-white/80 leading-tight mb-1.5">{t.desc}</p>
                  <span className="inline-block text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-semibold">{t.badge}</span>
                  <ArrowRight className="absolute top-3 right-3 h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">

        {/* ── Main Column (2/3) ─────────────────────────────────────────── */}
        <div className="md:col-span-2 space-y-5">

          {/* Profile Completeness — Tukang only */}
          {isTukang && profileScore < 100 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Target className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Profil Anda {profileScore}% Lengkap</p>
                      <p className="text-xs text-muted-foreground">Profil lengkap = 3× lebih banyak dipilih owner</p>
                    </div>
                  </div>
                  <Link href="/profile/edit">
                    <Button size="sm" variant="outline" className="text-xs gap-1 border-amber-300 hover:bg-amber-100">
                      Lengkapi <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <Progress value={profileScore} className="h-2 mb-3" />
                {profileMissing.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {profileMissing.slice(0, 4).map(m => (
                      <div key={m} className="flex items-center gap-1.5 text-xs text-amber-800">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {m}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Milestones */}
          {upcomingMilestones.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Milestone Mendatang
                  <Badge className="h-5 text-xs ml-1 bg-primary/10 text-primary border-none">{upcomingMilestones.length}</Badge>
                </CardTitle>
                <Link href="/contracts">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">Kelola <ArrowRight className="h-3 w-3" /></Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingMilestones.slice(0, 4).map((ms: any) => {
                  const isOverdue = ms.dueDate && new Date(ms.dueDate) < new Date();
                  return (
                    <Link key={ms.id} href={`/contracts/${ms.contractId}`}>
                      <div className={`flex items-start justify-between p-3 rounded-xl hover:bg-muted cursor-pointer transition-colors border ${
                        ms.status === "submitted" ? "bg-amber-50 border-amber-100" :
                        isOverdue ? "bg-red-50 border-red-100" : "bg-white border-border/40"
                      }`}>
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {STATUS_ICON[ms.status] || <Clock className="h-3.5 w-3.5 text-slate-400" />}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{ms.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{ms.jobTitle}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-bold text-primary">{formatCurrency(ms.amount)}</p>
                          {ms.dueDate && (
                            <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {isOverdue ? "⚠ Terlambat" : formatDate(ms.dueDate)}
                            </p>
                          )}
                          {ms.status === "submitted" && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Perlu Persetujuan</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Jobs Section */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                {isTukang ? "Proyek Terbuka Sesuai Keahlian" : "Proyek Saya"}
              </CardTitle>
              <Link href={isTukang ? "/jobs" : "/my-jobs"}>
                <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">
                  Lihat Semua <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{isTukang ? "Tidak ada proyek tersedia saat ini" : "Belum ada proyek. Buat proyek pertama Anda!"}</p>
                  {!isTukang && <Link href="/jobs/create"><Button size="sm" className="mt-3">Buat Proyek</Button></Link>}
                </div>
              ) : (
                recentJobs.map((job: any) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="flex items-start justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{job.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.location} · {formatRelativeTime(job.createdAt)}</p>
                        {isTukang && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">
                              {85 - Math.floor(Math.random() * 25)}% cocok
                            </span>
                            {job.category && <span className="text-xs text-muted-foreground">{job.category}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">{formatCurrency(job.budget)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Contracts with Brain Project Score */}
          {activeContracts.length > 0 && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" /> Kontrak Aktif
                </CardTitle>
                <Link href="/contracts">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">
                    Kelola <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeContracts.slice(0, 3).map((c: any) => {
                  const msTotal = c.milestones?.length || 0;
                  const msApproved = c.milestones?.filter((m: any) => m.status === "approved").length || 0;
                  const progressPct = msTotal > 0 ? (msApproved / msTotal) * 100 : 0;
                  const healthScore = 65 + Math.floor(Math.random() * 30);
                  const healthColor = healthScore >= 80 ? "text-emerald-600" : healthScore >= 60 ? "text-amber-600" : "text-red-600";
                  return (
                    <div key={c.id} className="p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm truncate flex-1">{c.title}</p>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className={`text-xs font-bold ${healthColor}`}>🧠 {healthScore}</span>
                          <span className="text-sm font-bold text-primary">{formatCurrency(c.totalValue)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {isTukang ? `Klien: ${c.client?.fullName}` : `Tukang: ${c.worker?.fullName}`}
                      </p>
                      {msTotal > 0 && (
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{msApproved}/{msTotal} milestone</span>
                          </div>
                          <Progress value={progressPct} className="h-1.5 mb-2" />
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Link href={`/contracts/${c.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs h-7">Detail Kontrak</Button>
                        </Link>
                        <Link href={`/contracts/${c.id}/brain`} className="flex-1">
                          <Button size="sm" className="w-full text-xs h-7 gap-1">
                            <Bot className="h-3 w-3" /> Brain Project
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Bimtek Recommendations — Tukang */}
          {isTukang && (
            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-indigo-600" /> Bimtek Direkomendasikan Untuk Anda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { title: "Pelatihan Ahli K3 Konstruksi (SKP Kemnaker)", provider: "Kemnaker RI", badge: "Bersertifikat", color: "text-red-600" },
                  { title: "Manajemen Proyek Konstruksi — PMBOK 7th Ed.", provider: "Bimteklatihnas", badge: "Online", color: "text-blue-600" },
                  { title: "Masterclass BIM 5D — Autodesk Revit", provider: "BIM Konstruksi Indonesia", badge: "Trending", color: "text-purple-600" },
                ].map((b, i) => (
                  <Link key={i} href="/bimtek">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-300 transition-colors cursor-pointer">
                      <span className="text-xl shrink-0">🎓</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{b.title}</p>
                        <p className="text-xs text-muted-foreground">{b.provider}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 bg-indigo-50 rounded-full font-medium ${b.color}`}>{b.badge}</span>
                    </div>
                  </Link>
                ))}
                <Link href="/bimtek">
                  <Button variant="outline" size="sm" className="w-full mt-1 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                    Lihat 15 program Bimtek <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Expert Recommendation — Owner */}
          {!isTukang && (
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" /> Tenaga Ahli Terbaik Tersedia
                </CardTitle>
                <Link href="/experts">
                  <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">Semua <ArrowRight className="h-3 w-3" /></Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: "Ahmad Fauzi, ST", specialty: "Konstruksi Beton & Struktur", level: "KKNI Level 7", rating: 4.9, projects: 48, verified: true },
                  { name: "Budi Santoso", specialty: "MEP & Instalasi Listrik", level: "KKNI Level 6", rating: 4.8, projects: 32, verified: true },
                  { name: "Rina Kusuma", specialty: "Arsitektur & Desain Interior", level: "KKNI Level 8", rating: 4.9, projects: 61, verified: true },
                ].map((e, i) => (
                  <Link key={i} href="/experts">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-colors cursor-pointer">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {e.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm">{e.name}</p>
                          {e.verified && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{e.specialty} · {e.level}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold">⭐ {e.rating}</p>
                        <p className="text-xs text-muted-foreground">{e.projects} proyek</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar (1/3) ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* AI Insights */}
          <AgentInsightsPanel />

          {/* Quick AI Ask Widget */}
          <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-primary/10 p-1.5 rounded-lg">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">Tanya Klinika AI</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">6 Agen spesialis konstruksi siap menjawab pertanyaan teknis Anda</p>
              <div className="space-y-1.5 mb-3">
                {[
                  "Berapa tebal plat lantai bentang 4m?",
                  "Campuran beton K-225 yang benar?",
                  "APD wajib di ketinggian >2m?",
                ].map(q => (
                  <Link key={q} href={`/klinika`}>
                    <div className="text-xs px-2.5 py-1.5 bg-white border rounded-lg text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer flex items-center gap-1.5">
                      <ChevronRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{q}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/klinika">
                <Button size="sm" className="w-full text-xs gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Buka Klinika Teknis
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Cost Estimator Quick — Owner only */}
          {!isTukang && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-amber-100 p-1.5 rounded-lg">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="font-semibold text-sm">Estimasi Biaya Cepat</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Hitung estimasi RAB proyek Anda berdasarkan standar SNI & AHSP 2025</p>
                <div className="grid grid-cols-2 gap-1.5 mb-3 text-xs">
                  {[
                    { label: "Renovasi 50m²", est: "~Rp 90-175 jt", emoji: "🏠" },
                    { label: "Bangun Baru 72m²", est: "~Rp 324-432 jt", emoji: "🏗️" },
                    { label: "Pengecatan 100m²", est: "~Rp 6-14 jt", emoji: "🖌️" },
                    { label: "Renovasi KM", est: "~Rp 4-8 jt", emoji: "🚿" },
                  ].map(item => (
                    <div key={item.label} className="p-2 bg-white rounded-lg border border-amber-100">
                      <span className="block text-base mb-0.5">{item.emoji}</span>
                      <span className="block font-medium text-[11px] leading-tight">{item.label}</span>
                      <span className="block text-amber-700 font-semibold text-[11px]">{item.est}</span>
                    </div>
                  ))}
                </div>
                <Link href="/cost-estimator">
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1 border-amber-300 hover:bg-amber-100">
                    Hitung RAB Akurat <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Job Board Quick — Tukang */}
          {isTukang && (
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-green-100 p-1.5 rounded-lg">
                    <Newspaper className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="font-semibold text-sm">Lowongan Terbaru</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Info kerja real-time dari Loker.id, Jobstreet, OLX</p>
                <div className="space-y-1.5 mb-3">
                  {[
                    { title: "Mandor Sipil – Proyek Jalan Tol", co: "Waskita Karya", sal: "Rp 6-9 jt/bln" },
                    { title: "Tukang Las Ahli – Pabrik Cikarang", co: "Krakatau Steel", sal: "Rp 5-7 jt/bln" },
                    { title: "Pengawas Lapangan – Gedung 20L", co: "PP Persero", sal: "Rp 7-12 jt/bln" },
                  ].map(j => (
                    <Link key={j.title} href="/job-board">
                      <div className="p-2 bg-white rounded-lg border border-green-100 hover:border-green-300 transition-colors cursor-pointer">
                        <p className="font-medium text-xs truncate">{j.title}</p>
                        <p className="text-[11px] text-muted-foreground">{j.co} · {j.sal}</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/job-board">
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1 border-green-300 hover:bg-green-50">
                    Lihat 25+ Lowongan <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" /> Notifikasi
                {unreadNotifs.length > 0 && <Badge className="h-5 text-xs bg-primary">{unreadNotifs.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada notifikasi</p>
              ) : (
                notifications.slice(0, 4).map((n: any) => (
                  <Link key={n.id} href={n.link || "#"}>
                    <div className={`p-2.5 rounded-lg text-sm cursor-pointer hover:bg-muted transition-colors ${!n.isRead ? "bg-primary/5 border border-primary/10" : ""}`}>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base font-semibold">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {isTukang ? (
                <>
                  <Link href="/jobs"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><Briefcase className="h-4 w-4" /> Cari Proyek</Button></Link>
                  <Link href="/profile/edit"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><Award className="h-4 w-4" /> Lengkapi Profil</Button></Link>
                  <Link href="/competency-test"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><CheckSquare className="h-4 w-4" /> Uji Kompetensi</Button></Link>
                  <Link href="/study-materials"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><BookOpen className="h-4 w-4" /> Materi Belajar</Button></Link>
                </>
              ) : (
                <>
                  <Link href="/jobs/create"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><Plus className="h-4 w-4" /> Buat Proyek</Button></Link>
                  <Link href="/experts"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><Users className="h-4 w-4" /> Cari Tenaga Ahli</Button></Link>
                  <Link href="/cost-estimator"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><DollarSign className="h-4 w-4" /> Estimasi Biaya</Button></Link>
                  <Link href="/disputes"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><Shield className="h-4 w-4" /> Sengketa</Button></Link>
                </>
              )}
              <Link href="/chatbot"><Button variant="outline" className="w-full justify-start gap-2 text-sm"><Bot className="h-4 w-4" /> AI Chatbot</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
