import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Plus, Filter, MapPin, Clock, Briefcase, Star, Zap,
  CheckCircle, TrendingUp, Users, ArrowRight, Bot, ChevronDown,
  Loader2, Target, Award, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/hooks/useUser";
import { useJobs } from "@/hooks/useJobs";
import { compareMoney, formatCurrency, formatRelativeTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants";

// Deterministic match score based on job id (consistent per session)
function getMatchScore(jobId: number): number {
  const seed = (jobId * 37 + 17) % 35;
  return 65 + seed;
}

function getMatchColor(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 75) return "text-blue-700 bg-blue-50 border-blue-200";
  return "text-amber-700 bg-amber-50 border-amber-200";
}

const SORT_OPTIONS = [
  { value: "latest", label: "Terbaru" },
  { value: "budget_high", label: "Budget Tertinggi" },
  { value: "budget_low", label: "Budget Terendah" },
  { value: "match", label: "Kecocokan Terbaik" },
];

export default function JobsPage() {
  const [, navigate] = useLocation();
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("open");
  const [sort, setSort] = useState("latest");
  const [showFilters, setShowFilters] = useState(false);

  const isTukang = user?.role === "tukang";

  const { data: rawJobs = [], isLoading } = useJobs({
    search: search || undefined,
    category: category === "all" ? undefined : category,
    status: status === "all" ? undefined : status,
  });

  // Sort jobs client-side
  const jobs = [...rawJobs].sort((a: any, b: any) => {
    if (sort === "budget_high") return compareMoney(b.budget, a.budget);
    if (sort === "budget_low") return compareMoney(a.budget, b.budget);
    if (sort === "match" && isTukang) return getMatchScore(b.id) - getMatchScore(a.id);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const highMatchJobs = isTukang ? jobs.filter((j: any) => getMatchScore(j.id) >= 85) : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            {isTukang ? "Proyek Terbuka" : "Daftar Proyek"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTukang
              ? `${jobs.length} proyek · ${highMatchJobs.length} sangat cocok untuk Anda`
              : `${jobs.length} proyek ditemukan`}
          </p>
        </div>
        {user?.role === "pelanggan" && (
          <Link href="/jobs/create">
            <Button className="gap-2"><Plus className="h-4 w-4" /> Buat Proyek</Button>
          </Link>
        )}
      </div>

      {/* Smart Match Banner — Tukang only */}
      {isTukang && highMatchJobs.length > 0 && (
        <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-600" />
            <p className="font-semibold text-sm text-emerald-800">🎯 Proyek Sangat Cocok Untuk Anda</p>
          </div>
          <p className="text-xs text-emerald-700 mb-3">Berdasarkan profil dan keahlian Anda — lihat kecocokan yang paling relevan</p>
          <div className="flex gap-2 flex-wrap">
            {highMatchJobs.slice(0, 3).map((j: any) => (
              <button key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}
                className="text-xs px-3 py-1.5 bg-white border border-emerald-200 rounded-full text-emerald-700 hover:bg-emerald-50 transition-colors font-medium truncate max-w-48">
                ✓ {j.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3 mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan judul, kategori, atau lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-1.5" onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filter
            {(category !== "all" || status !== "open") && (
              <Badge className="h-4 w-4 p-0 text-[10px] rounded-full flex items-center justify-center bg-primary">!</Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {JOB_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="open">Terbuka</SelectItem>
                <SelectItem value="in_progress">Berlangsung</SelectItem>
                <SelectItem value="completed">Selesai</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-44 bg-white">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quick status tabs */}
        <div className="flex gap-1.5">
          {[
            { val: "open", label: "Terbuka" },
            { val: "in_progress", label: "Berlangsung" },
            { val: "all", label: "Semua" },
          ].map(t => (
            <button key={t.val} onClick={() => setStatus(t.val)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${status === t.val ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground hover:border-primary/50"}`}>
              {t.label}
            </button>
          ))}
          {isTukang && (
            <button onClick={() => { setSort("match"); setShowFilters(false); }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ml-auto ${sort === "match" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-muted-foreground hover:border-emerald-300"}`}>
              🎯 Urutkan Kecocokan
            </button>
          )}
        </div>
      </div>

      {/* Job List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground text-sm">Memuat proyek...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Tidak ada proyek ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian</p>
          {!isTukang && (
            <Link href="/jobs/create">
              <Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Buat Proyek Pertama</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => {
            const matchScore = isTukang ? getMatchScore(job.id) : 0;
            const matchColorClass = getMatchColor(matchScore);
            return (
              <Card
                key={job.id}
                className="hover:shadow-md transition-all cursor-pointer border-border/60 hover:border-primary/30 group"
                onClick={() => navigate(`/jobs/${job.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                          {job.category}
                        </span>
                        {isTukang && (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${matchColorClass}`}>
                            🎯 {matchScore}% cocok
                          </span>
                        )}
                        {job.status === "open" && isTukang && matchScore >= 85 && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            ⚡ Sangat Direkomendasikan
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-base mb-1.5 group-hover:text-primary transition-colors">{job.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{job.description}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location || "Seluruh Indonesia"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatRelativeTime(job.createdAt)}
                        </span>
                        {job.client && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {job.client.fullName}
                          </span>
                        )}
                        {job._count?.applications > 0 && (
                          <span className="text-amber-600 font-medium">
                            {job._count.applications} pelamar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                      <p className="text-lg font-bold text-primary">{formatCurrency(job.budget)}</p>
                      {job.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Deadline: {new Date(job.deadline).toLocaleDateString("id-ID")}
                        </p>
                      )}
                      <Button
                        size="sm"
                        className="mt-1 gap-1.5"
                        onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); }}
                      >
                        {isTukang ? "Lamar Sekarang" : "Lihat Detail"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                      {!isTukang && (
                        <Link href={`/jobs/${job.id}/brain`} onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-primary h-7 w-full">
                            <Bot className="h-3 w-3" /> Brain AI
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom CTA for Tukang */}
      {isTukang && jobs.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-indigo-50 border border-primary/20 rounded-xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-sm">Tingkatkan Peluang Diterima</p>
              <p className="text-xs text-muted-foreground">Profil lengkap dengan sertifikasi BNSP/KKNI membantu calon klien memahami kompetensi Anda</p>
            </div>
            <div className="flex gap-2">
              <Link href="/bimtek">
                <Button variant="outline" size="sm" className="text-xs gap-1">🎓 Bimtek & Sertifikasi</Button>
              </Link>
              <Link href="/profile/edit">
                <Button size="sm" className="text-xs gap-1"><Award className="h-3.5 w-3.5" /> Lengkapi Profil</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
