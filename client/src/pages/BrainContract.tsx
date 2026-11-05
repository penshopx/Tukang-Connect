import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { authenticatedRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/useUser";
import { addMoney, formatCurrency, formatDate, subtractMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Brain, AlertTriangle, CheckCircle2, Info,
  ShieldCheck, GitBranch, Wallet, TrendingUp, Search,
  Zap, Clock, RefreshCw, ChevronRight, Activity
} from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700", label: "Kritis" },
  warning:  { icon: <AlertTriangle className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Peringatan" },
  info:     { icon: <Info className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700", label: "Info" },
};

const STATUS_CONFIG = {
  excellent: { color: "text-emerald-600", bg: "from-emerald-500 to-green-400", ring: "border-emerald-400", label: "Sangat Baik", desc: "Semua aspek pekerjaan berjalan optimal." },
  good:      { color: "text-blue-600", bg: "from-blue-500 to-indigo-400", ring: "border-blue-400", label: "Baik", desc: "Kondisi umum baik, ada beberapa hal kecil yang perlu diperhatikan." },
  warning:   { color: "text-amber-600", bg: "from-amber-500 to-orange-400", ring: "border-amber-400", label: "Perlu Perhatian", desc: "Ada masalah yang perlu segera ditangani." },
  critical:  { color: "text-red-600", bg: "from-red-500 to-rose-400", ring: "border-red-400", label: "Kritis", desc: "Ada masalah serius yang harus diselesaikan segera." },
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  compliance: <ShieldCheck className="h-5 w-5" />,
  sequence:   <GitBranch className="h-5 w-5" />,
  budget:     <Wallet className="h-5 w-5" />,
  progress:   <TrendingUp className="h-5 w-5" />,
  quality:    <Search className="h-5 w-5" />,
};

function ScoreRing({ score, status }: { score: number; status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.good;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 144, height: 144 }}>
      <svg width="144" height="144" className="-rotate-90">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="72" cy="72" r={r} fill="none" stroke="url(#scoreGrad)" strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"} />
            <stop offset="100%" stopColor={score >= 70 ? "#3b82f6" : score >= 50 ? "#f97316" : "#dc2626"} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${cfg.color}`}>{score}</span>
        <span className="text-xs text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
}

function AgentCard({ agentKey, agent }: { agentKey: string; agent: any }) {
  const icon = AGENT_ICONS[agentKey];
  const scoreColor = agent.score >= 80 ? "text-emerald-600" : agent.score >= 60 ? "text-amber-600" : "text-red-600";
  const progressColor = agent.score >= 80 ? "bg-emerald-500" : agent.score >= 60 ? "bg-amber-500" : "bg-red-500";
  const criticals = agent.findings?.filter((f: any) => f.severity === "critical").length || 0;
  const warnings = agent.findings?.filter((f: any) => f.severity === "warning").length || 0;

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${agent.score >= 80 ? "bg-emerald-500" : agent.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${agent.score >= 80 ? "bg-emerald-50 text-emerald-600" : agent.score >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
              {icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{agent.label_id}</p>
              <p className="text-xs text-muted-foreground">{agent.icon} Bobot {agent.weight}%</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-black ${scoreColor}`}>{agent.score}</span>
            <p className="text-xs text-muted-foreground">{agent.label}</p>
          </div>
        </div>
        <Progress value={agent.score} className="mt-3 h-1.5" />
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{agent.summary}</p>
        <div className="flex gap-2 mt-2">
          {criticals > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{criticals} kritis</span>}
          {warnings > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{warnings} peringatan</span>}
          {criticals === 0 && warnings === 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Semua baik</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrainContractPage() {
  const [, params] = useRoute("/contracts/:id/brain");
  const [, navigate] = useLocation();
  const contractId = Number(params?.id);
  const { data: user } = useUser();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/agents/brain-contract", contractId],
    queryFn: ({ signal }) => authenticatedRequest(`/api/agents/brain-contract/${contractId}`, signal).then((r) => r.json()),
    enabled: !!contractId && !!user,
    staleTime: 60_000,
  });

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
      <p className="font-medium text-muted-foreground">Silakan masuk untuk mengakses Brain Project.</p>
      <Button className="mt-4" onClick={() => navigate("/login")}>Masuk</Button>
    </div>
  );

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <Brain className="h-8 w-8 text-primary absolute inset-0 m-auto" />
      </div>
      <p className="text-lg font-semibold">Menganalisis Kontrak...</p>
       <p className="text-sm text-muted-foreground text-center max-w-sm">AI sedang memeriksa kepatuhan kontrak, urutan konstruksi, anggaran, progres, dan kualitas lapangan.</p>
    </div>
  );

  if (error || !data) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
      <p className="font-medium">Tidak dapat mengakses Brain Project.</p>
      <p className="text-sm text-muted-foreground mt-1">Anda mungkin tidak memiliki akses ke kontrak ini.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/contracts")}>Kembali ke Kontrak</Button>
    </div>
  );

  const statusCfg = STATUS_CONFIG[data.overallStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.good;
  const approvedMs = data.milestones?.filter((m: any) => m.status === "approved").length || 0;
  const totalMs = data.milestones?.length || 0;
  const progressPct = totalMs > 0 ? Math.round((approvedMs / totalMs) * 100) : 0;
  const totalPaid = addMoney(...(data.milestones?.filter((m: any) => m.status === "approved").map((m: any) => m.amount) || []));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/${contractId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Brain Project</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Supervisi AI</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{data.contract?.title}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-1.5 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Health Score Banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${statusCfg.bg} p-6 text-white shadow-lg`}>
        <div className="flex items-center gap-6">
          <div className="bg-white/20 rounded-2xl p-2">
            <ScoreRing score={data.healthScore} status={data.overallStatus} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-white/80" />
              <span className="text-white/80 text-sm font-medium">Skor Kesehatan Proyek</span>
            </div>
            <h2 className="text-3xl font-black text-white">{statusCfg.label}</h2>
            <p className="text-white/80 text-sm mt-1">{statusCfg.desc}</p>
            <div className="flex gap-4 mt-3">
              {data.criticalCount > 0 && (
                <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-white font-bold text-lg">{data.criticalCount}</p>
                  <p className="text-white/70 text-xs">Kritis</p>
                </div>
              )}
              {data.warningCount > 0 && (
                <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-white font-bold text-lg">{data.warningCount}</p>
                  <p className="text-white/70 text-xs">Peringatan</p>
                </div>
              )}
              <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
                <p className="text-white font-bold text-lg">{progressPct}%</p>
                <p className="text-white/70 text-xs">Selesai</p>
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
                <p className="text-white font-bold text-sm">{formatCurrency(totalPaid)}</p>
                <p className="text-white/70 text-xs">Terbayar</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-white/50 text-xs mt-4">Dianalisis pada {new Date(data.generatedAt).toLocaleString("id-ID")} · Dukungan AI aktif</p>
      </div>

      {/* Action Items */}
      {data.actions?.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Tindakan yang Diperlukan</h2>
          {data.actions.map((action: any, i: number) => (
            <div
              key={i}
              onClick={() => action.link && navigate(action.link)}
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${action.priority === "segera" ? "bg-red-50 border-red-200 hover:bg-red-100" : action.priority === "disarankan" ? "bg-amber-50 border-amber-200 hover:bg-amber-100" : "bg-blue-50 border-blue-200 hover:bg-blue-100"}`}
            >
              <div className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${action.priority === "segera" ? "bg-red-200 text-red-800" : action.priority === "disarankan" ? "bg-amber-200 text-amber-800" : "bg-blue-200 text-blue-800"}`}>
                {action.priority === "segera" ? "🔴 SEGERA" : action.priority === "disarankan" ? "🟡 DISARANKAN" : "🔵 PANTAU"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{action.detail}</p>
              </div>
              {action.link && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {/* 5 Agent Scores */}
      <div>
        <h2 className="font-bold text-base mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Laporan Per Agen Supervisi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(data.agents || {}).map(([key, agent]: [string, any]) => (
            <AgentCard key={key} agentKey={key} agent={agent} />
          ))}
        </div>
      </div>

      {/* All Findings */}
      {data.allFindings?.length > 0 && (
        <div>
          <h2 className="font-bold text-base mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Semua Temuan ({data.allFindings.length})
            {data.criticalCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{data.criticalCount} kritis</span>}
            {data.warningCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{data.warningCount} peringatan</span>}
          </h2>
          <div className="space-y-2">
            {data.allFindings.map((finding: any, i: number) => {
              const cfg = SEVERITY_CONFIG[finding.severity as keyof typeof SEVERITY_CONFIG];
              return (
                <div key={i} className={`p-4 rounded-xl border ${cfg.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`${cfg.color} mt-0.5 flex-shrink-0`}>{cfg.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">{finding.code}</span>
                        <span className="text-xs text-muted-foreground">{finding.agentName.replace("Agent", " Agent")}</span>
                      </div>
                      <p className={`font-semibold text-sm ${cfg.color}`}>{finding.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{finding.detail}</p>
                      <div className="mt-2 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-primary font-medium">{finding.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expected Construction Sequence */}
      {data.expectedSequence?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Urutan Standar Konstruksi — {data.job?.category}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Berdasarkan standar keilmuan konstruksi Indonesia (SNI)</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {data.expectedSequence.map((step: string, i: number) => {
                const msMatch = data.milestones?.find((m: any) =>
                  m.title.toLowerCase().split(" ").some((w: string) =>
                    w.length > 3 && step.toLowerCase().includes(w)
                  )
                );
                const done = msMatch?.status === "approved";
                const inProg = msMatch?.status === "in_progress" || msMatch?.status === "submitted";
                return (
                  <div key={i} className="flex items-start gap-3 py-2 relative">
                    {i < data.expectedSequence.length - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${done ? "bg-emerald-500 border-emerald-500 text-white" : inProg ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-300 text-gray-500"}`}>
                      {done ? "✓" : inProg ? "●" : i + 1}
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className={`text-sm font-medium ${done ? "text-emerald-700 line-through opacity-70" : inProg ? "text-blue-700" : "text-gray-700"}`}>{step}</p>
                      {msMatch && <p className="text-xs text-muted-foreground mt-0.5">→ {msMatch.title} · {msMatch.status}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone Status Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Status Milestone ({totalMs} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{approvedMs} dari {totalMs} milestone selesai</span>
              <span className="font-semibold">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
          <div className="space-y-2">
            {data.milestones?.map((ms: any) => {
              const isOverdue = ms.dueDate && new Date(ms.dueDate) < new Date() && ms.status !== "approved";
              return (
                <div key={ms.id} className={`flex items-center justify-between p-3 rounded-lg border ${ms.status === "approved" ? "bg-emerald-50 border-emerald-200" : isOverdue ? "bg-red-50 border-red-200" : ms.status === "submitted" ? "bg-blue-50 border-blue-200" : ms.status === "in_progress" ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{ms.status === "approved" ? "✅" : isOverdue ? "🔴" : ms.status === "submitted" ? "📋" : ms.status === "in_progress" ? "⚙️" : "⏳"}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ms.title}</p>
                      {ms.dueDate && <p className={`text-xs ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>{isOverdue ? "⚠ Terlambat · " : ""}Target: {formatDate(ms.dueDate)}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-semibold">{formatCurrency(ms.amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t flex justify-between">
            <span className="text-sm text-muted-foreground">Terbayar</span>
            <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Sisa</span>
            <span className="font-bold text-amber-600">{formatCurrency(subtractMoney(data.contract?.totalValue || "0", totalPaid))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium">Total Kontrak</span>
            <span className="font-bold">{formatCurrency(data.contract?.totalValue || "0")}</span>
          </div>
        </CardContent>
      </Card>

      {/* CTA Back to Contract */}
      <div className="pb-6 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate(`/contracts/${contractId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Kontrak
        </Button>
        <Button className="flex-1 bg-gradient-to-r from-primary to-indigo-600" onClick={() => refetch()}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Analisis Ulang
        </Button>
      </div>
    </div>
  );
}
