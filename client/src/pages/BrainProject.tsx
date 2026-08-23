import { useRoute, useLocation, Link } from "wouter";
import {
  Brain, AlertTriangle, CheckCircle, Clock, TrendingUp, Users,
  DollarSign, ArrowLeft, Zap, Target, BarChart3, Star,
  ChevronRight, ShieldAlert, Calendar, Trophy, Lightbulb, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";

function useBrainProject(jobId: number) {
  return useQuery({
    queryKey: ["/api/agents/brain-project", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/brain-project/${jobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal mengambil analisis");
      return res.json();
    },
    enabled: !!jobId,
    staleTime: 60_000,
  });
}

const RISK_CONFIG = {
  high: { label: "Risiko Tinggi", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", bar: "bg-red-500", icon: <ShieldAlert className="h-5 w-5 text-red-500" /> },
  medium: { label: "Risiko Sedang", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", bar: "bg-amber-500", icon: <AlertTriangle className="h-5 w-5 text-amber-500" /> },
  low: { label: "Risiko Rendah", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", bar: "bg-green-500", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
};

const FACTOR_ICON: Record<string, React.ReactNode> = {
  high: <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />,
  medium: <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />,
  low: <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />,
};

const ACTION_CONFIG = {
  urgent: { bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", label: "Segera" },
  recommended: { bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700", label: "Disarankan" },
  optional: { bg: "bg-slate-50 border-slate-200", badge: "bg-slate-100 text-slate-700", label: "Opsional" },
};

const BADGE_STYLE: Record<string, string> = {
  "Top Pick": "bg-amber-100 text-amber-800 border-amber-200",
  "Good Match": "bg-green-100 text-green-800 border-green-200",
  "Consider": "bg-blue-100 text-blue-800 border-blue-200",
};

export default function BrainProject() {
  const [, params] = useRoute("/jobs/:id/brain");
  const [, navigate] = useLocation();
  const jobId = Number(params?.id);
  const { data: user } = useUser();
  const { data, isLoading, error, refetch } = useBrainProject(jobId);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary" />
            <Brain className="h-7 w-7 text-primary absolute inset-0 m-auto" />
          </div>
          <div>
            <p className="font-semibold text-lg">Menganalisis Proyek...</p>
            <p className="text-sm text-muted-foreground mt-1">AI sedang menghitung risiko, timeline, dan rekomendasi terbaik</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
        <p className="font-semibold text-lg mb-2">Analisis tidak tersedia</p>
        <p className="text-muted-foreground text-sm mb-4">Pastikan Anda adalah pemilik proyek ini.</p>
        <Button onClick={() => navigate(`/jobs/${jobId}`)}>Kembali ke Proyek</Button>
      </div>
    );
  }

  const { job, riskScore, riskLevel, riskFactors, applications, ranked, matchedWorkers, priceSuggestion, contract, milestones, progress, timeline, actions, generatedAt } = data;
  const riskCfg = RISK_CONFIG[riskLevel as keyof typeof RISK_CONFIG];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <button onClick={() => navigate(`/jobs/${jobId}`)} className="flex items-center gap-1 text-muted-foreground mb-6 hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Detail Proyek
      </button>

      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-blue-50 to-indigo-50 border border-primary/15 p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/15 rounded-2xl">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">Brain Project</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">AI Analysis</Badge>
              </div>
              <p className="text-muted-foreground text-sm font-medium">{job.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {job.category} · {job.location} · {formatCurrency(job.budget)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Diperbarui {new Date(generatedAt).toLocaleTimeString("id")}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: <BarChart3 className="h-4 w-4" />, label: "Progress", value: `${progress}%`, color: "text-primary" },
            { icon: <Users className="h-4 w-4" />, label: "Pelamar", value: applications.total, color: "text-blue-600" },
            { icon: <Calendar className="h-4 w-4" />, label: "Est. Durasi", value: `${timeline.estimatedDays} hari`, color: "text-purple-600" },
            { icon: <Target className="h-4 w-4" />, label: "Aksi Dibutuhkan", value: actions.filter((a: any) => a.priority === "urgent").length, color: "text-red-600" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white/70 rounded-xl p-3 border border-white/60">
              <div className={`flex items-center gap-1.5 mb-1 ${kpi.color}`}>
                {kpi.icon}
                <span className="text-xs font-medium">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* LEFT: main analysis */}
        <div className="md:col-span-2 space-y-5">

          {/* Risk Score */}
          <Card className="shadow-sm overflow-hidden">
            <div className={`${riskCfg.bg} border-b ${riskCfg.border} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {riskCfg.icon}
                  <h2 className="font-semibold">{riskCfg.label}</h2>
                </div>
                <span className={`text-3xl font-black ${riskCfg.color}`}>{riskScore}<span className="text-base font-normal text-muted-foreground">/100</span></span>
              </div>
              <div className="relative h-3 bg-black/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${riskCfg.bar}`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {riskScore >= 60 ? "Proyek ini membutuhkan perhatian segera untuk menghindari masalah lebih lanjut."
                  : riskScore >= 30 ? "Ada beberapa faktor yang perlu diperhatikan agar proyek berjalan lancar."
                  : "Proyek dalam kondisi baik. Pantau terus agar tetap on-track."}
              </p>
            </div>
            {riskFactors.length > 0 && (
              <CardContent className="p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Faktor Risiko Teridentifikasi</p>
                {riskFactors.map((f: any, i: number) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                    f.level === "high" ? "bg-red-50 border-red-100" :
                    f.level === "medium" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"
                  }`}>
                    {FACTOR_ICON[f.level]}
                    <div>
                      <p className="font-medium text-sm">{f.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* AI Action Plan */}
          {actions.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Rencana Aksi AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actions.map((action: any, i: number) => {
                  const cfg = ACTION_CONFIG[action.priority as keyof typeof ACTION_CONFIG];
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${cfg.bg}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">{action.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm">{action.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{action.detail}</p>
                        </div>
                        {action.link && (
                          <Link href={action.link}>
                            <Button size="sm" variant="outline" className="flex-shrink-0 gap-1 text-xs h-7 px-2">
                              Buka <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Application Ranking */}
          {ranked.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> Ranking Pelamar AI
                  <Badge variant="outline" className="ml-auto text-xs">{ranked.length} pelamar</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ranked.map((r: any, i: number) => (
                  <div key={r.applicationId} className={`p-3 rounded-xl border ${i === 0 ? "bg-amber-50 border-amber-200" : "border-border/60"}`}>
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={i === 0 ? "bg-amber-100 text-amber-700" : ""}>{getInitials(r.applicantName)}</AvatarFallback>
                        </Avatar>
                        {i === 0 && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{r.applicantName}</p>
                          {r.badge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${BADGE_STYLE[r.badge]}`}>{r.badge}</span>
                          )}
                        </div>
                        {r.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">"{r.message}"</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span>Skor: <strong className="text-foreground">{r.totalScore}/100</strong></span>
                          {r.proposedBudget && <span>Tawaran: <strong className="text-primary">{formatCurrency(r.proposedBudget)}</strong></span>}
                          {r.profile?.rating > 0 && <span>⭐ {r.profile.rating.toFixed(1)}</span>}
                        </div>
                        {/* Score breakdown mini */}
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${r.totalScore}%` }} />
                        </div>
                      </div>
                      <Link href={`/experts/${r.applicantId}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2 flex-shrink-0">Profil</Button>
                      </Link>
                    </div>
                  </div>
                ))}
                <Link href={`/jobs/${jobId}`}>
                  <Button variant="outline" className="w-full gap-2 mt-1 text-sm">
                    <Users className="h-4 w-4" /> Lihat & Terima Lamaran
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Timeline Prediction */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" /> Prediksi Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 mb-0.5">Estimasi Durasi</p>
                  <p className="font-bold text-purple-800">{timeline.estimatedDays} hari kerja</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-muted-foreground mb-0.5">Perkiraan Selesai</p>
                  <p className="font-bold">{formatDate(timeline.predictedEndDate)}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Rencana Milestone Otomatis</p>
              <div className="space-y-2">
                {timeline.milestonePlan.map((ms: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate">{ms.title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{ms.estimatedDays} hari</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(ms.amount)} ({ms.percentage}%)</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">
          {/* Progress */}
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Progress Proyek</p>
                <span className="text-2xl font-black text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3 mb-3" />
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Status</span>
                  <span className="font-medium capitalize">{
                    job.status === "open" ? "Mencari Tukang" :
                    job.status === "in_progress" ? "Sedang Dikerjakan" :
                    job.status === "completed" ? "Selesai" : job.status
                  }</span>
                </div>
                {milestones.length > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Milestone</span>
                    <span className="font-medium">{milestones.filter((m: any) => m.status === "approved").length}/{milestones.length} selesai</span>
                  </div>
                )}
                {contract && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Kontrak</span>
                    <span className="font-medium text-green-600">Aktif</span>
                  </div>
                )}
              </div>
              {contract && (
                <Link href={`/contracts/${contract.id}`}>
                  <Button size="sm" className="w-full mt-3 gap-1.5 text-xs">
                    <ChevronRight className="h-3 w-3" /> Kelola Kontrak
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Price Analysis */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" /> Analisis Harga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="space-y-2">
                {[
                  { label: "Minimum Pasar", value: priceSuggestion.adjustedMin, color: "text-slate-600" },
                  { label: "Harga Tengah", value: priceSuggestion.adjustedMid, color: "text-blue-600" },
                  { label: "Maksimum Pasar", value: priceSuggestion.adjustedMax, color: "text-slate-600" },
                ].map((p) => (
                  <div key={p.label} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground text-xs">{p.label}</span>
                    <span className={`font-semibold text-xs ${p.color}`}>{formatCurrency(p.value)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-xs text-muted-foreground">Anggaran Anda</span>
                  <span className={`font-bold text-xs ${
                    job.budget < priceSuggestion.adjustedMin * 5 ? "text-red-600" :
                    job.budget < priceSuggestion.adjustedMid * 5 ? "text-amber-600" : "text-green-600"
                  }`}>{formatCurrency(job.budget)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{priceSuggestion.unit}</p>
              <div className="space-y-1">
                {priceSuggestion.tips.slice(0, 2).map((tip: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    {tip}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Matched Workers */}
          {matchedWorkers.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Tukang Terbaik
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matchedWorkers.map((w: any, i: number) => (
                  <Link key={w.workerId} href={`/experts/${w.workerId}`}>
                    <div className="flex items-center gap-3 hover:bg-muted p-2 rounded-xl cursor-pointer transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(w.workerName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{w.workerName}</p>
                        <p className="text-xs text-muted-foreground">Skor {w.totalScore}/100</p>
                      </div>
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
                        background: `conic-gradient(rgb(99 102 241) ${w.totalScore * 3.6}deg, #e2e8f0 0deg)`
                      }}>
                        <div className="h-5 w-5 bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-primary">{i + 1}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Applications summary */}
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ringkasan Lamaran</p>
              <div className="space-y-2">
                {[
                  { label: "Total Pelamar", value: applications.total, color: "text-foreground" },
                  { label: "Menunggu Review", value: applications.pending, color: applications.pending > 0 ? "text-amber-600" : "text-muted-foreground" },
                  { label: "Diterima", value: applications.accepted, color: applications.accepted > 0 ? "text-green-600" : "text-muted-foreground" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between text-sm">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className={`font-bold text-sm ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
              {applications.pending > 0 && (
                <Link href={`/jobs/${jobId}`}>
                  <Button size="sm" variant="outline" className="w-full mt-3 text-xs gap-1">
                    <Users className="h-3.5 w-3.5" /> Review Lamaran
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
