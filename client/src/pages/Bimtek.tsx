import { useState, useEffect } from "react";
import {
  GraduationCap, Clock, Users, Star, ChevronDown, ChevronUp,
  Search, Filter, ExternalLink, BookOpen, Calendar, Award,
  TrendingUp, Layers, CheckCircle2, Play, Globe, FileText,
  Download, Loader2, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pemula: { label: "Pemula", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  menengah: { label: "Menengah", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  lanjutan: { label: "Lanjutan", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  semua: { label: "Semua Level", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" },
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  online: { label: "Online", icon: "💻", color: "text-blue-600" },
  offline: { label: "Offline", icon: "🏢", color: "text-green-600" },
  hybrid: { label: "Hybrid", icon: "🔄", color: "text-purple-600" },
  self_paced: { label: "Self-Paced", icon: "📱", color: "text-orange-600" },
};

interface Course {
  id: string; title: string; provider: string; category: string; type: string;
  level: string; duration: string; durationHours: number; price: number; priceLabel: string;
  description: string; topics: string[]; outcomes: string[]; certification: boolean;
  certBody?: string; nextBatch?: string; source: string; sourceUrl: string;
  rating: number; participants: number; isFeatured: boolean; isGovernment: boolean;
  tags: string[];
}

const CATEGORIES = ["Semua", "Struktur & Sipil", "Estimasi & RAB", "BIM & Digital", "K3 Konstruksi", "Manajemen Proyek", "Hukum & Kontrak", "MEP", "Arsitektur", "Alat Berat", "SNI & Regulasi"];

export default function BimtekPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [level, setLevel] = useState("Semua");
  const [type, setType] = useState("Semua");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch("/api/bimtek", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setCourses(d.courses || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.provider.toLowerCase().includes(search.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = category === "Semua" || c.category === category;
    const matchLvl = level === "Semua" || c.level === level;
    const matchType = type === "Semua" || c.type === type;
    return matchSearch && matchCat && matchLvl && matchType;
  });

  const featured = filtered.filter(c => c.isFeatured);
  const regular = filtered.filter(c => !c.isFeatured);
  const allSorted = [...featured, ...regular];

  const stats = [
    { label: "Total Bimtek", value: courses.length, icon: "📚" },
    { label: "Bersertifikat", value: courses.filter(c => c.certification).length, icon: "🏆" },
    { label: "Program Pemerintah", value: courses.filter(c => c.isGovernment).length, icon: "🏛️" },
    { label: "Online/Self-Paced", value: courses.filter(c => c.type === "online" || c.type === "self_paced").length, icon: "💻" },
  ];

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Memuat program Bimtek konstruksi...</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" /> Bimtek & Pelatihan Teknis Konstruksi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bimbingan teknis, pelatihan skill konstruksi, dan manajemen proyek — dari lembaga pemerintah & swasta terpercaya
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center border">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-5 text-sm">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-blue-800">
          <strong>Sumber data:</strong> Program bimtek dari PUPR/Kemenaker, Platindo, Bimteklatihnas, BIM Konstruksi, Sainstara Training, dan lembaga sertifikasi BNSP terakreditasi. Klik "Daftar Sekarang" untuk ke halaman resmi penyelenggara.
        </div>
      </div>

      {/* Search + Filter */}
      <div className="space-y-3 mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari topik, lembaga, atau kata kunci..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-1.5" onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>
        {showFilters && (
          <div className="p-4 bg-muted/30 rounded-xl border space-y-3">
            <div>
              <p className="text-xs font-semibold mb-2">Level</p>
              <div className="flex gap-1.5 flex-wrap">
                {["Semua", "pemula", "menengah", "lanjutan"].map(l => (
                  <button key={l} onClick={() => setLevel(l)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${level === l ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground"}`}>
                    {l === "Semua" ? "Semua Level" : LEVEL_CONFIG[l]?.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold mb-2">Format</p>
              <div className="flex gap-1.5 flex-wrap">
                {["Semua", "online", "offline", "hybrid", "self_paced"].map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${type === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-muted-foreground"}`}>
                    {t === "Semua" ? "Semua Format" : TYPE_CONFIG[t]?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${category === cat ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground hover:border-primary/50"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">Menampilkan <strong>{allSorted.length}</strong> program pelatihan</p>

      {/* Course Cards */}
      {allSorted.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground"><GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>Tidak ada program yang sesuai</p></div>
      ) : (
        <div className="space-y-4">
          {allSorted.map(course => {
            const isExpanded = expandedId === course.id;
            const lvlConf = LEVEL_CONFIG[course.level] || LEVEL_CONFIG.semua;
            const typeConf = TYPE_CONFIG[course.type] || { label: course.type, icon: "📖", color: "text-gray-600" };

            return (
              <Card key={course.id} className={`border transition-all hover:shadow-md ${course.isFeatured ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-50 flex items-center justify-center text-xl shrink-0">
                      {course.isGovernment ? "🏛️" : course.type === "online" || course.type === "self_paced" ? "💻" : "🎓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-start gap-2 justify-between flex-wrap">
                        <div>
                          <h3 className="font-bold text-base leading-snug">{course.title}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">{course.provider}</p>
                        </div>
                        {course.isFeatured && <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${lvlConf.bg} ${lvlConf.color}`}>{lvlConf.label}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full bg-muted ${typeConf.color}`}>{typeConf.icon} {typeConf.label}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">{course.category}</span>
                        {course.certification && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Award className="h-3 w-3" /> Bersertifikat
                          </span>
                        )}
                        {course.isGovernment && <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">🏛️ Pemerintah</span>}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.duration}</span>
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.participants.toLocaleString("id")} peserta</span>
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{course.rating.toFixed(1)}</span>
                        {course.nextBatch && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{course.nextBatch}</span>}
                      </div>

                      {/* Price */}
                      <div className="mt-2">
                        <span className={`font-bold text-sm ${course.price === 0 ? "text-emerald-700" : "text-foreground"}`}>{course.priceLabel}</span>
                      </div>

                      {/* Description */}
                      <p className={`text-sm text-muted-foreground mt-2 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>{course.description}</p>

                      {/* Expanded */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          {course.topics.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-2">📋 Materi yang Dipelajari:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {course.topics.map(t => (
                                  <div key={t} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />{t}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {course.outcomes.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-2">🎯 Hasil yang Didapat:</p>
                              <div className="space-y-1">
                                {course.outcomes.map(o => (
                                  <div key={o} className="flex items-start gap-1.5 text-xs">
                                    <span className="text-primary shrink-0">→</span><span>{o}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {course.certification && course.certBody && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                              <p className="text-xs font-semibold text-amber-800">🏆 Sertifikasi:</p>
                              <p className="text-xs text-amber-700 mt-1">{course.certBody}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <button onClick={() => setExpandedId(isExpanded ? null : course.id)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline">
                          {isExpanded ? <><ChevronUp className="h-3 w-3" /> Sembunyikan</> : <><ChevronDown className="h-3 w-3" /> Lihat detail</>}
                        </button>
                        <a href={course.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5 h-8 text-xs">
                            <ExternalLink className="h-3 w-3" /> Daftar Sekarang
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
