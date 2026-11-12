import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Shield, Award, HardHat, ArrowRight, CheckCircle,
  Wrench, Zap, Home, Paintbrush, Layers, Wifi, Droplets,
  Bot, MessageSquare, Calculator, BookOpen, Newspaper, Trophy,
  ChevronRight, Users, Briefcase, FileText, TrendingUp, Target,
  Building2, GraduationCap, BarChart2, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SERVICE_CATEGORIES = [
  { icon: <Home className="h-6 w-6" />, label: "Renovasi", color: "bg-blue-50 text-blue-600", descriptor: "Perbaikan ruang dan hunian" },
  { icon: <HardHat className="h-6 w-6" />, label: "Konstruksi Baru", color: "bg-orange-50 text-orange-600", descriptor: "Bangun baru dari awal" },
  { icon: <Zap className="h-6 w-6" />, label: "Listrik", color: "bg-yellow-50 text-yellow-600", descriptor: "Instalasi dan perawatan" },
  { icon: <Droplets className="h-6 w-6" />, label: "Plambing", color: "bg-cyan-50 text-cyan-600", descriptor: "Air bersih dan sanitasi" },
  { icon: <Paintbrush className="h-6 w-6" />, label: "Pengecatan", color: "bg-pink-50 text-pink-600", descriptor: "Finishing yang rapi" },
  { icon: <Layers className="h-6 w-6" />, label: "Lantai", color: "bg-purple-50 text-purple-600", descriptor: "Pemasangan dan perawatan" },
  { icon: <Wrench className="h-6 w-6" />, label: "Las", color: "bg-red-50 text-red-600", descriptor: "Fabrikasi dan sambungan" },
  { icon: <Wifi className="h-6 w-6" />, label: "Sipil", color: "bg-green-50 text-green-600", descriptor: "Pekerjaan struktur lapangan" },
];

type Testimonial = {
  name: string;
  role: string;
  location: string;
  text: string;
  feature: string;
  featureLink: string;
  avatar: string;
};

const TESTIMONIALS: Testimonial[] = [];

const AI_TOOLS = [
  {
    emoji: "🧠", title: "Klinika Teknis", badge: "Panduan Teknis",
     desc: "Forum tanya jawab teknis dengan dukungan AI spesialis untuk Struktur, Arsitektur, MEP, K3, Manajemen, dan Material. Referensi standar membantu jawaban tetap terarah.",
    link: "/klinika", color: "from-purple-600/30 to-violet-800/20 border-purple-500/30",
     highlights: ["Referensi SNI & PUIL", "Jawaban dari berbagai perspektif", "Pertanyaan lanjutan yang relevan"],
    forRole: "semua",
  },
  {
     emoji: "💰", title: "Estimator Biaya RAB", badge: "Acuan SNI & AHSP",
     desc: "Susun estimasi anggaran proyek dengan rincian komponen, pertimbangan lokasi, dan acuan AHSP yang relevan.",
    link: "/cost-estimator", color: "from-amber-600/30 to-orange-800/20 border-amber-500/30",
     highlights: ["Pertimbangan lokasi", "Rincian material dan upah", "Pilihan tingkat kualitas"],
    forRole: "owner",
  },
  {
     emoji: "🔮", title: "Brain Project", badge: "Supervisi Cerdas",
     desc: "Supervisi kontrak aktif secara berkala. AI membantu memantau kepatuhan, urutan pekerjaan, anggaran, progres, dan kualitas lapangan.",
    link: "/dashboard", color: "from-blue-600/30 to-indigo-800/20 border-blue-500/30",
     highlights: ["Ringkasan kesehatan proyek", "Deteksi risiko lebih dini", "Rekomendasi tindakan prioritas"],
    forRole: "owner",
  },
  {
     emoji: "🎯", title: "AI Worker Matching", badge: "Pencocokan Cerdas",
    desc: "Sistem pencocokan cerdas tukang ↔ proyek. Skor berdasarkan keahlian, lokasi, rating, level SKK/KKNI, dan pengalaman.",
    link: "/experts", color: "from-green-600/30 to-emerald-800/20 border-green-500/30",
     highlights: ["Skor kecocokan yang transparan", "Filter berdasarkan keahlian", "Validasi SKK"],
    forRole: "semua",
  },
  {
     emoji: "🏆", title: "Uji Kompetensi SKKNI", badge: "Persiapan Sertifikasi",
     desc: "Latihan kompetensi konstruksi untuk mengulang materi dan mengenali topik yang perlu dipelajari.",
    link: "/competency-test", color: "from-rose-600/30 to-pink-800/20 border-rose-500/30",
     highlights: ["Materi sesuai topik", "Latihan mandiri", "Penjelasan jawaban"],
    forRole: "tukang",
  },
  {
     emoji: "📚", title: "Materi Belajar", badge: "Belajar Mandiri",
     desc: "Pelajari materi teknis konstruksi dan lanjutkan dengan latihan kompetensi.",
    link: "/study-materials", color: "from-teal-600/30 to-cyan-800/20 border-teal-500/30",
     highlights: ["Materi teknis konstruksi", "Belajar sesuai keahlian", "Latihan kompetensi tersedia"],
    forRole: "tukang",
  },
];

const HOW_IT_WORKS_OWNER = [
  {
    step: "1", icon: "📋", title: "Posting Proyek + Estimasi RAB",
    desc: "Deskripsikan kebutuhan Anda. Gunakan Estimator Biaya untuk menyusun anggaran berbasis SNI sebelum negosiasi.",
    link: "/jobs/create", linkLabel: "Buat Proyek",
  },
  {
    step: "2", icon: "🎯", title: "AI Mencarikan Tukang Terbaik",
    desc: "Sistem AI kami mencocokkan proyek dengan tukang berdasarkan keahlian, lokasi, SKK, dan rating. Anda tinggal pilih.",
    link: "/experts", linkLabel: "Lihat Ahli",
  },
  {
    step: "3", icon: "📝", title: "Kontrak Digital + Milestone Otomatis",
    desc: "Kontrak digital dengan tanda tangan elektronik. Milestone pembayaran digenerate otomatis oleh AI.",
    link: "/contracts", linkLabel: "Kelola Kontrak",
  },
  {
    step: "4", icon: "🔮", title: "Supervisi Real-time dengan Brain Project",
    desc: "Dukungan AI membantu memantau proyek Anda: kepatuhan, urutan pekerjaan, kesehatan anggaran, progres, dan kualitas lapangan.",
    link: "/dashboard", linkLabel: "Buka Dashboard",
  },
];

const HOW_IT_WORKS_TUKANG = [
  {
    step: "1", icon: "👤", title: "Buat Profil Lengkap + SKK/KKNI",
    desc: "Upload sertifikasi BNSP/KKNI, keahlian, dan portofolio proyek agar calon klien dapat menilai kompetensi Anda dengan lebih mudah.",
    link: "/register", linkLabel: "Daftar Gratis",
  },
  {
    step: "2", icon: "🏆", title: "Tingkatkan Kompetensi",
    desc: "Gunakan materi belajar dan latihan uji kompetensi untuk mengembangkan keahlian.",
    link: "/study-materials", linkLabel: "Lihat Materi",
  },
  {
    step: "3", icon: "📋", title: "Lamar Proyek Sesuai Keahlian",
    desc: "AI menampilkan skor kecocokan setiap proyek untuk Anda. Fokus lamar proyek dengan match tertinggi.",
    link: "/jobs", linkLabel: "Cari Proyek",
  },
  {
    step: "4", icon: "💰", title: "Kelola Kontrak & Terima Pembayaran",
    desc: "Kelola milestone, submit progress, dan terima pembayaran terstruktur. Semua terdokumentasi digital.",
    link: "/dashboard", linkLabel: "Buka Dashboard",
  },
];

const TRUST_SIGNALS = [
  { icon: "📋", label: "Standar kompetensi", value: "SNI · SKKNI · KKNI" },
  { icon: "📋", label: "Standar konstruksi", value: "SNI · SKKNI · KKNI" },
  { icon: "🔐", label: "Keamanan transaksi", value: "Kontrak digital terenkripsi" },
  { icon: "⚡", label: "Powered by", value: "Multi-Agent AI System" },
];

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [activeRole, setActiveRole] = useState<"owner" | "tukang">("owner");
  const [, navigate] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/experts?search=${encodeURIComponent(search)}`);
  };

  const howItWorks = activeRole === "owner" ? HOW_IT_WORKS_OWNER : HOW_IT_WORKS_TUKANG;
  const filteredTools = AI_TOOLS.filter(t => t.forRole === "semua" || t.forRole === activeRole);

  return (
    <div className="min-h-screen">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-grid-white/[0.03] [background-size:32px_32px]" />
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-5 bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm px-4 py-1.5 gap-2">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Marketplace Konstruksi Berbasis AI
            </Badge>

            <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight tracking-tight">
              Hubungkan{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Owner & Boher
              </span>{" "}
              dengan
              <br />
              <span className="text-yellow-400">Tukang, Mandor</span>
              <br />
              <span className="text-slate-200">& Tenaga Ahli Konstruksi</span>
            </h1>

            <p className="text-base md:text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Platform kerja konstruksi harian & borongan dengan <strong className="text-white">dukungan AI terintegrasi</strong> —
              dari matching tukang, supervisi kontrak, estimasi biaya RAB, hingga klinika teknis SNI.
            </p>

            {/* Role Toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex p-1 bg-white/10 rounded-xl backdrop-blur gap-1">
                {[
                  { id: "owner", label: "🏠 Saya Owner/Boher", desc: "Cari tukang & kelola proyek" },
                  { id: "tukang", label: "👷 Saya Tukang/Mandor", desc: "Cari proyek & tingkatkan skill" },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRole(r.id as any)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeRole === r.id
                        ? "bg-white text-slate-900 shadow-lg"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {r.label}
                    <span className={`block text-xs font-normal mt-0.5 ${activeRole === r.id ? "text-slate-500" : "text-slate-500"}`}>
                      {r.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-7">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={activeRole === "owner" ? "Cari tukang beton, mandor, ahli K3..." : "Cari proyek renovasi, konstruksi, MEP..."}
                  className="pl-12 h-13 bg-white/10 border-white/20 text-white placeholder:text-slate-400 rounded-xl focus:bg-white/15 text-base py-3.5"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-[54px] px-8 bg-blue-500 hover:bg-blue-400 rounded-xl font-semibold gap-2"
                onClick={() => activeRole === "tukang" ? navigate("/jobs") : undefined}
              >
                {activeRole === "owner" ? (
                  <><Search className="h-4 w-4" /> Cari Tukang</>
                ) : (
                  <><Briefcase className="h-4 w-4" /> Cari Proyek</>
                )}
              </Button>
            </form>

            {/* Trust Pills */}
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              {(activeRole === "owner" ? [
                 { text: "Tenaga ahli dengan profil kompetensi" },
                { text: "Kontrak Digital + Milestone Otomatis" },
                { text: "Brain Project AI Supervision" },
                { text: "Estimasi RAB Gratis" },
              ] : [
                 { text: "Peluang proyek yang relevan" },
                { text: "Materi teknis dan latihan kompetensi" },
                { text: "Uji Kompetensi SKKNI" },
                { text: "Profil SKK/KKNI Terverifikasi" },
              ]).map(pill => (
                <span key={pill.text} className="flex items-center gap-1.5 text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  {pill.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Feature Shortcuts */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {(activeRole === "owner" ? [
              { icon: "🤖", label: "Klinika AI", href: "/klinika" },
              { icon: "💰", label: "Estimasi RAB", href: "/cost-estimator" },
              { icon: "🔮", label: "Brain Project", href: "/dashboard" },
              { icon: "👷", label: "Cari Ahli", href: "/experts" },
              { icon: "📋", label: "Buat Proyek", href: "/jobs/create" },
              { icon: "💬", label: "AI Chatbot", href: "/chatbot" },
            ] : [
              { icon: "📋", label: "Cari Proyek", href: "/jobs" },
              { icon: "🎓", label: "Materi Belajar", href: "/study-materials" },
              { icon: "🏆", label: "Uji SKKNI", href: "/competency-test" },
              { icon: "📚", label: "Materi Belajar", href: "/study-materials" },
              { icon: "🗞️", label: "Cari Proyek", href: "/jobs" },
              { icon: "💬", label: "AI Chatbot", href: "/chatbot" },
            ]).map(item => (
              <Link key={item.href} href={item.href}>
                <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs text-slate-300 font-medium text-center leading-tight">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 30C1080 70 360 -10 0 30L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── Quality Signals ──────────────────────────────────────────────── */}
      <section className="py-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: "Tenaga ahli terarah", icon: "👷", sub: "Profil dan kompetensi lebih mudah ditinjau" },
              { label: "Proyek lebih tertata", icon: "✅", sub: "Kebutuhan dan progres terdokumentasi" },
              { label: "Belajar berkelanjutan", icon: "🎓", sub: "Materi dan pelatihan yang relevan" },
              { label: "Pendampingan berbasis AI", icon: "🤖", sub: "Bantuan saat menyusun keputusan" },
            ].map((s) => (
              <div key={s.label} className="group">
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="font-semibold text-sm text-primary mb-0.5">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Service Categories ──────────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Kategori Keahlian yang Relevan</h2>
            <p className="text-muted-foreground">Klik kategori untuk mencari tenaga ahli terverifikasi</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => navigate(`/experts?category=${encodeURIComponent(cat.label)}`)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:shadow-md transition-all group border border-transparent hover:border-border"
              >
                <div className={`p-3 rounded-xl ${cat.color} group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <span className="text-xs font-semibold text-center text-foreground">{cat.label}</span>
                <span className="text-[10px] text-muted-foreground">{cat.descriptor}</span>
              </button>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link href="/experts">
              <Button variant="outline" className="gap-2">
                Lihat Semua Keahlian <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works — Role-Specific ───────────────────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Cara Kerja KerjaProyek</h2>
            <p className="text-muted-foreground mb-5">Pilih peran Anda untuk melihat alur yang relevan</p>
            <div className="flex justify-center">
              <div className="flex p-1 bg-muted rounded-xl gap-1">
                {[
                  { id: "owner", label: "🏠 Untuk Owner/Boher" },
                  { id: "tukang", label: "👷 Untuk Tukang/Mandor" },
                ].map(r => (
                  <button key={r.id} onClick={() => setActiveRole(r.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeRole === r.id ? "bg-white shadow text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {howItWorks.map((item, i) => (
              <div key={item.step} className="relative">
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-primary/20 -translate-x-1/2 z-0" />
                )}
                <Card className="border-none shadow-sm hover:shadow-md transition-shadow relative z-10">
                  <CardContent className="p-5">
                    <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center text-xl font-black mb-4">
                      {item.emoji || item.step}
                    </div>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <h3 className="font-bold text-base mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">{item.desc}</p>
                    <Link href={item.link}>
                      <Button variant="ghost" size="sm" className="text-primary gap-1 px-0 h-auto text-xs">
                        {item.linkLabel} <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI-Powered Tools Showcase — Role-Filtered ──────────────────── */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-500/30 text-sm px-4 py-1.5 gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse inline-block" />
              Didukung AI terintegrasi
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Ekosistem Tools Konstruksi Cerdas</h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-5">
              Tools bertenaga AI untuk kebutuhan industri konstruksi Indonesia — semua terintegrasi dalam satu platform
            </p>
            <div className="flex justify-center">
              <div className="flex p-1 bg-white/10 rounded-xl gap-1">
                {[
                  { id: "owner", label: "🏠 Untuk Owner" },
                  { id: "tukang", label: "👷 Untuk Tukang" },
                ].map(r => (
                  <button key={r.id} onClick={() => setActiveRole(r.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeRole === r.id ? "bg-white text-slate-900 shadow" : "text-slate-300 hover:text-white hover:bg-white/10"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <a key={tool.title} href={tool.link}>
                <div className={`p-5 rounded-2xl bg-gradient-to-br border ${tool.color} hover:scale-[1.02] hover:border-white/20 transition-all cursor-pointer group h-full`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{tool.emoji}</span>
                    <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-medium text-slate-300 border border-white/10">
                      {tool.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-blue-300 transition-colors">{tool.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-3">{tool.desc}</p>
                  <ul className="space-y-1.5">
                    {tool.highlights.map(h => (
                      <li key={h} className="text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{h}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-1 text-blue-300 text-xs font-semibold">
                    Coba Sekarang <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/register">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-400 gap-2 text-base font-semibold px-8">
                Coba Semua Fitur Gratis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-slate-500 text-xs mt-2">Tidak perlu kartu kredit. Langsung aktif.</p>
          </div>
        </div>
      </section>

      {/* ── Features 3-Col ─────────────────────────────────────────────── */}
      {TESTIMONIALS.length > 0 && (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Mengapa Memilih KerjaProyek?</h2>
            <p className="text-muted-foreground">Marketplace, supervisi berbasis AI, dan edukasi teknis dalam satu alur kerja</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🎯", title: "AI Matching Cerdas", bg: "bg-blue-50",
                points: [
                  "Skor kecocokan tukang-proyek multi-kriteria",
                  "Validasi SKK/KKNI otomatis",
                  "Ranking lamaran dengan AI",
                  "Rekomendasi cerdas di dashboard",
                ],
              },
              {
                icon: "🔮", title: "Supervisi Proyek AI", bg: "bg-purple-50",
                points: [
                  "Brain Project dengan supervisi real-time",
                  "Ringkasan kesehatan proyek",
                  "Deteksi risiko & anomali otomatis",
                  "Validasi sequence SNI konstruksi",
                ],
              },
              {
                icon: "🎓", title: "Ekosistem Pengembangan", bg: "bg-green-50",
                points: [
                  "Materi belajar dan latihan kompetensi SKKNI",
                  "Simulasi uji kompetensi SKKNI",
                  "Klinika Teknis dengan dukungan AI + SNI",
                  "Materi K3, Struktur, MEP, Manajemen",
                ],
              },
            ].map((f) => (
              <Card key={f.title} className="border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`${f.bg} w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4`}>{f.icon}</div>
                  <h3 className="text-lg font-bold mb-3">{f.title}</h3>
                  <ul className="space-y-2">
                    {f.points.map(p => (
                      <li key={p} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ── Connected Workflow ─────────────────────────────────────────── */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Fitur yang Saling Terhubung</h2>
            <p className="text-muted-foreground">Setiap fitur dirancang untuk mendukung perjalanan proyek dari pencarian hingga pengembangan kompetensi</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "🎯", title: "Temukan kecocokan", desc: "Cari tenaga ahli atau proyek berdasarkan kebutuhan, lokasi, dan kompetensi yang relevan." },
              { icon: "📝", title: "Susun pekerjaan", desc: "Dokumentasikan ruang lingkup, estimasi biaya, kontrak, dan tahapan kerja dengan lebih rapi." },
              { icon: "🔮", title: "Pantau progres", desc: "Gunakan ringkasan proyek dan dukungan AI untuk mengenali risiko serta langkah berikutnya." },
              { icon: "🎓", title: "Kembangkan kompetensi", desc: "Akses materi, pelatihan, dan persiapan sertifikasi untuk mendukung perkembangan profesional." },
            ].map((item) => (
              <Card key={item.title} className="border-border/60 shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="font-bold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Cerita Sukses Pengguna Kami</h2>
            <p className="text-muted-foreground">Mereka sudah merasakan manfaat fitur-fitur KerjaProyek</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {t.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{t.name}</p>
                        <Link href={t.featureLink}>
                          <Badge className="text-[10px] h-4 px-2 bg-primary/10 text-primary border-none hover:bg-primary/20 cursor-pointer">
                            via {t.feature}
                          </Badge>
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground">{t.role} · {t.location}</p>
                      <p className="text-[11px] text-primary font-medium mt-1">Pengalaman menggunakan KerjaProyek</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed italic">"{t.text}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ──────────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-y">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TRUST_SIGNALS.map(t => (
              <div key={t.label}>
                <div className="text-2xl mb-1.5">{t.icon}</div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">{t.label}</p>
                <p className="text-sm font-bold">{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chatbot CTA Widget ─────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                <div className="bg-primary p-2.5 rounded-xl">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-bold">AI Chatbot KerjaProyek</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-600 font-medium">Online sekarang · Dukungan AI aktif</span>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Ada Pertanyaan Teknis Konstruksi?</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Tanya apa saja — tebal pondasi, campuran beton, APD K3, biaya renovasi, cara urus PBG.
                Dibantu AI spesialis dengan referensi SNI.
              </p>
              <div className="flex gap-2 flex-wrap justify-center md:justify-start">
                <Link href="/chatbot">
                  <Button className="gap-2">
                    <MessageSquare className="h-4 w-4" /> Buka AI Chatbot
                  </Button>
                </Link>
                <Link href="/klinika">
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" /> Forum Klinika
                  </Button>
                </Link>
              </div>
            </div>
            <div className="w-full md:w-80 bg-white rounded-2xl shadow-md border p-4">
              <div className="space-y-2">
                {[
                  { q: "Bagaimana menentukan tebal plat lantai?", agent: "🏗️ Agen Struktur" },
                  { q: "APD apa yang wajib untuk kerja di ketinggian?", agent: "⛑️ Agen K3" },
                  { q: "Bagaimana menghitung biaya renovasi kamar mandi?", agent: "📚 Knowledge Base" },
                ].map(item => (
                  <Link href="/chatbot" key={item.q}>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/50 hover:bg-primary/5 border border-border/40 hover:border-primary/30 transition-colors cursor-pointer">
                      <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.q}</p>
                        <p className="text-[10px] text-muted-foreground">{item.agent}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/chatbot">
                <Button size="sm" variant="ghost" className="w-full mt-2 text-xs text-primary gap-1">
                  Tanya pertanyaan Anda <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {activeRole === "owner"
              ? "Siap Mulai Proyek dengan Pengawasan AI?"
              : "Siap Dapat Proyek & Tingkatkan Kompetensi?"}
          </h2>
          <p className="text-blue-200 mb-8 text-lg max-w-2xl mx-auto">
            {activeRole === "owner"
              ? "Daftar gratis. Post proyek, AI carikan tukang terbaik, pantau dengan Brain Project."
              : "Daftar gratis. Buat profil SKK/KKNI, akses bimtek, dan mulai dapat proyek hari ini."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 gap-2 font-semibold px-8">
                Mulai Gratis Sekarang <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={activeRole === "owner" ? "/experts" : "/jobs"}>
              <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 gap-2">
                {activeRole === "owner" ? "Lihat Tenaga Ahli" : "Lihat Proyek Tersedia"}
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            {[
              { href: "/chatbot", label: "💬 AI Chatbot" },
              { href: "/klinika", label: "🧠 Klinika Teknis" },
              { href: "/cost-estimator", label: "💰 Estimator RAB" },
              { href: "/study-materials", label: "📚 Materi Belajar" },
            ].map(l => (
              <Link key={l.href} href={l.href}>
                <span className="text-sm text-blue-200 hover:text-white underline underline-offset-2 transition-colors">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
