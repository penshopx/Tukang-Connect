import { useState, useEffect } from "react";
import {
  Search, MapPin, Clock, Briefcase, Building2, ExternalLink,
  RefreshCw, Star, CheckCircle2, ChevronDown, ChevronUp,
  TrendingUp, DollarSign, Users, Filter, X, Info,
  BookmarkPlus, Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  full_time: { label: "Full Time",   color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  kontrak:   { label: "Kontrak",     color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  harian:    { label: "Harian",      color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  borongan:  { label: "Borongan",    color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  part_time: { label: "Part Time",   color: "text-teal-700",   bg: "bg-teal-50 border-teal-200" },
};

const SOURCE_ICONS: Record<string, string> = {
  "Loker.id": "🔵",
  "Indeed": "🔴",
  "Jobstreet": "🟠",
  "Jooble": "🟢",
  "OLX": "🟡",
  "KerjaProyek": "🏗️",
};

const WORKTYPE_CONFIG: Record<string, string> = {
  Onsite: "📍 Di Lokasi",
  Hybrid: "🔄 Hybrid",
  Remote: "💻 Remote",
  Borongan: "📋 Borongan",
  Bervariasi: "📌 Bervariasi",
};

const CATEGORIES = ["Semua", "Pengawasan", "Pelaksana", "Supervisor", "Manajemen", "Engineering", "MEP", "Estimasi", "Mandor", "Tukang Kayu", "Tukang Batu", "Las", "Plambing", "Listrik", "Lantai", "Pengecatan", "Atap", "Waterproofing", "Finishing", "Konstruksi Baru", "Renovasi", "Alat Berat", "Konsultan", "QC/QA", "Teknik"];
const LOCATIONS = ["Semua", "Jakarta", "Jakarta Barat", "Jakarta Selatan", "Jakarta Pusat", "Bandung", "Surabaya", "Banten", "Bali", "Yogyakarta", "Semarang", "Malang", "Bekasi", "Depok", "Tangerang", "Bogor", "Medan", "Makassar", "Kalimantan Timur"];
const TYPES = ["Semua", "full_time", "kontrak", "harian", "borongan", "part_time"];

export default function JobBoardPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [salaryRef, setSalaryRef] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrapedAt, setScrapedAt] = useState<string>("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [location, setLocation] = useState("Semua");
  const [type, setType] = useState("Semua");
  const [sortBy, setSortBy] = useState("terbaru");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSalaryRef, setShowSalaryRef] = useState(false);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"jobs" | "salary">("jobs");

  const fetchJobs = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/external-jobs${force ? "?refresh=1" : ""}`, { credentials: "include" });
      const data = await res.json();
      setJobs(data.jobs || []);
      setScrapedAt(data.scrapedAt);
    } catch {
      toast({ title: "Gagal memuat lowongan", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSalaryRef = async () => {
    try {
      const res = await fetch("/api/salary-reference", { credentials: "include" });
      setSalaryRef(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchJobs(); fetchSalaryRef(); }, []);

  const filtered = jobs
    .filter((j) => {
      const q = search.toLowerCase();
      const matchSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.category.toLowerCase().includes(q) || j.description.toLowerCase().includes(q);
      const matchCat = category === "Semua" || j.category === category;
      const matchLoc = location === "Semua" || j.location.includes(location.split(" ")[0]);
      const matchType = type === "Semua" || j.type === type;
      return matchSearch && matchCat && matchLoc && matchType;
    })
    .sort((a, b) => {
      if (sortBy === "terbaru") return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      if (sortBy === "gaji_tinggi") return b.salaryMax - a.salaryMax;
      if (sortBy === "gaji_rendah") return a.salaryMin - b.salaryMin || a.salaryMax - b.salaryMax;
      return 0;
    });

  const featured = filtered.filter((j) => j.isFeatured);
  const regular = filtered.filter((j) => !j.isFeatured);
  const allSorted = [...featured, ...regular];

  const toggleSave = (id: string) => {
    setSavedJobs((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const activeFiltersCount = [category !== "Semua", location !== "Semua", type !== "Semua"].filter(Boolean).length;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Memuat lowongan konstruksi dari berbagai sumber...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> Papan Lowongan Konstruksi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lowongan tukang, mandor, supervisor & tenaga ahli — dikumpulkan dari Loker.id, Indeed, Jooble, Jobstreet & OLX
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fetchJobs(true)} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Memperbarui..." : "Perbarui"}
            </Button>
          </div>
        </div>
        {scrapedAt && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Terakhir diperbarui: {new Date(scrapedAt).toLocaleString("id-ID")}
          </p>
        )}
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { icon: <Briefcase className="h-4 w-4 text-blue-600" />, label: "Total Lowongan", value: jobs.length, bg: "bg-blue-50" },
          { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, label: "Full Time", value: jobs.filter(j => j.type === "full_time" || j.type === "kontrak").length, bg: "bg-emerald-50" },
          { icon: <Users className="h-4 w-4 text-amber-600" />, label: "Harian/Borongan", value: jobs.filter(j => j.type === "harian" || j.type === "borongan").length, bg: "bg-amber-50" },
          { icon: <Star className="h-4 w-4 text-purple-600" />, label: "Unggulan", value: jobs.filter(j => j.isFeatured).length, bg: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-muted rounded-xl w-fit">
        {[
          { id: "jobs", label: "🔍 Cari Lowongan" },
          { id: "salary", label: "💰 Referensi Upah" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "jobs" && (
        <>
          {/* Search + Filter */}
          <div className="space-y-3 mb-5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari posisi, perusahaan, atau kata kunci..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" className={`gap-1.5 ${activeFiltersCount > 0 ? "border-primary text-primary" : ""}`} onClick={() => setShowFilters(v => !v)}>
                <Filter className="h-4 w-4" />
                Filter {activeFiltersCount > 0 && <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFiltersCount}</span>}
              </Button>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white text-foreground cursor-pointer">
                <option value="terbaru">Terbaru</option>
                <option value="gaji_tinggi">Gaji Tertinggi</option>
                <option value="gaji_rendah">Gaji Terendah</option>
              </select>
            </div>

            {showFilters && (
              <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
                <div>
                  <p className="text-xs font-semibold mb-2">Tipe Pekerjaan</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {TYPES.map((t) => (
                      <button key={t} onClick={() => setType(t)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${type === t ? "bg-primary text-white border-primary" : "border-border bg-white text-muted-foreground hover:border-primary/50"}`}>
                        {t === "Semua" ? "Semua Tipe" : (TYPE_CONFIG[t]?.label || t)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Kategori</p>
                  <div className="flex gap-1.5 flex-wrap max-h-20 overflow-y-auto">
                    {CATEGORIES.map((c) => (
                      <button key={c} onClick={() => setCategory(c)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${category === c ? "bg-indigo-600 text-white border-indigo-600" : "border-border bg-white text-muted-foreground hover:border-indigo-400"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Lokasi</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {LOCATIONS.slice(0, 12).map((l) => (
                      <button key={l} onClick={() => setLocation(l)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${location === l ? "bg-emerald-600 text-white border-emerald-600" : "border-border bg-white text-muted-foreground hover:border-emerald-400"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" onClick={() => { setCategory("Semua"); setLocation("Semua"); setType("Semua"); }}>
                    <X className="h-3 w-3" /> Hapus semua filter
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              Menampilkan <strong>{allSorted.length}</strong> lowongan
              {(search || activeFiltersCount > 0) && ` dari ${jobs.length} total`}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> Data dari: Loker.id, Indeed, Jooble, Jobstreet, OLX
            </p>
          </div>

          {/* Job Cards */}
          {allSorted.length === 0 ? (
            <div className="py-16 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium">Tidak ada lowongan yang sesuai</p>
              <p className="text-sm text-muted-foreground mt-1">Coba ubah kata kunci atau filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allSorted.map((job) => {
                const typeConf = TYPE_CONFIG[job.type] || { label: job.type, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
                const isExpanded = expandedId === job.id;
                const isSaved = savedJobs.has(job.id);

                return (
                  <Card key={job.id} className={`border transition-all hover:shadow-md ${job.isFeatured ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-50 flex items-center justify-center text-lg shrink-0">
                          {SOURCE_ICONS[job.source] || "🏗️"}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-bold text-base leading-tight">{job.title}</h3>
                                {job.isFeatured && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                                {job.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {job.company}</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.location}</span>
                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(job.postedAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => toggleSave(job.id)} className={`p-1.5 rounded-lg transition-colors ${isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted"}`}>
                                <BookmarkPlus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Badges */}
                          <div className="flex gap-2 flex-wrap mt-2 mb-2">
                            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${typeConf.bg} ${typeConf.color}`}>{typeConf.label}</span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{job.category}</span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{WORKTYPE_CONFIG[job.workType] || job.workType}</span>
                            {job.level && <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">KKNI {job.level}</span>}
                          </div>

                          {/* Salary */}
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            <span className={`text-sm font-bold ${job.salaryMin > 0 ? "text-emerald-700" : "text-muted-foreground"}`}>{job.salaryLabel}</span>
                          </div>

                          {/* Description (collapsed) */}
                          <p className={`text-sm text-muted-foreground leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>{job.description}</p>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {job.requirements?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1.5">Kualifikasi:</p>
                                  <div className="space-y-1">
                                    {job.requirements.map((r: string) => (
                                      <div key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                        <span>{r}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {job.benefits?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1.5">Benefit / Fasilitas:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {job.benefits.map((b: string) => (
                                      <span key={b} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{b}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                            <div className="flex gap-2">
                              <button onClick={() => setExpandedId(isExpanded ? null : job.id)}
                                className="text-xs text-primary flex items-center gap-1 hover:underline">
                                {isExpanded ? <><ChevronUp className="h-3 w-3" /> Sembunyikan</> : <><ChevronDown className="h-3 w-3" /> Lihat detail</>}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <a href={job.sourceUrl} target={job.sourceUrl.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                                  {job.source === "KerjaProyek" ? <Briefcase className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                  {job.source === "KerjaProyek" ? "Lihat di Platform" : `Buka ${job.source}`}
                                </Button>
                              </a>
                              {job.source === "KerjaProyek" && (
                                <a href="/register">
                                  <Button size="sm" className="gap-1.5 h-8 text-xs">
                                    Lamar Sekarang
                                  </Button>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Footer notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Tentang data lowongan ini</p>
              <p>Lowongan dikumpulkan dari <strong>Loker.id, Indeed, Jooble, Jobstreet</strong>, dan <strong>OLX</strong> melalui proses agregasi otomatis. Data diperbarui secara berkala. Untuk melamar, klik tombol "Buka [Sumber]" untuk membuka halaman asli lowongan tersebut.</p>
              <p className="mt-1">Ingin proyek Anda tampil di sini? <a href="/jobs/create" className="underline font-medium">Posting proyek di KerjaProyek</a> dan jangkau ratusan tenaga ahli.</p>
            </div>
          </div>
        </>
      )}

      {/* Salary Reference Tab */}
      {activeTab === "salary" && salaryRef && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Referensi upah berdasarkan data <strong>{salaryRef.source}</strong>. Harga aktual dapat bervariasi tergantung lokasi, pengalaman, dan kesepakatan.</span>
          </div>

          {/* Upah Harian */}
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Upah Harian (per Orang/Hari — 8 Jam Kerja)
            </h2>
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Posisi / Jenis Tukang</th>
                        <th className="text-right px-4 py-3 font-semibold">Upah Harian</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Estimasi/Bulan (22 hari)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRef.harian.map((item: any, i: number) => (
                        <tr key={i} className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-muted/20"}`}>
                          <td className="px-4 py-3 font-medium">{item.position}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {formatCurrency(item.rate * 22)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upah Borongan */}
          <div>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Upah Borongan (per Satuan Pekerjaan)
            </h2>
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold">Jenis Pekerjaan</th>
                        <th className="text-right px-4 py-3 font-semibold">Satuan</th>
                        <th className="text-right px-4 py-3 font-semibold text-emerald-700">Rentang Harga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryRef.borongan.map((item: any, i: number) => (
                        <tr key={i} className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-muted/20"}`}>
                          <td className="px-4 py-3 font-medium">{item.pekerjaan}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs">{item.unit}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{item.range}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground">
            <p className="font-semibold mb-1">⚠️ Catatan Penting</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Upah di atas adalah referensi nasional 2025 dari {salaryRef.source}</li>
              <li>Di Jakarta & kota besar: naikkan 20-35% dari angka di atas</li>
              <li>Di luar Jawa: bisa 10-20% lebih rendah</li>
              <li>Tukang bersertifikat BNSP/SKT umumnya mematok lebih tinggi 15-25%</li>
              <li>Angka borongan sudah termasuk jasa tukang saja (material tidak termasuk kecuali disebutkan)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
