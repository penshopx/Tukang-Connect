import { useLocation } from "wouter";
import { Brain, Star, Award, Loader2, Trophy, TrendingUp, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAgentRankApplications } from "@/hooks/useAgents";
import { getInitials, formatCurrency } from "@/lib/utils";

interface Props {
  jobId: number;
  onAccept?: (appId: number, workerId: number) => void;
  jobStatus: string;
}

const BADGE_STYLE: Record<string, string> = {
  "Top Pick": "bg-amber-100 text-amber-800 border-amber-200",
  "Good Match": "bg-green-100 text-green-800 border-green-200",
  "Consider": "bg-blue-100 text-blue-800 border-blue-200",
};

const BADGE_ICON: Record<string, React.ReactNode> = {
  "Top Pick": <Trophy className="h-3 w-3" />,
  "Good Match": <CheckCircle className="h-3 w-3" />,
  "Consider": <TrendingUp className="h-3 w-3" />,
};

export default function AgentRankPanel({ jobId, onAccept, jobStatus }: Props) {
  const [, navigate] = useLocation();
  const { data, isLoading } = useAgentRankApplications(jobId);

  if (isLoading) return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
      <span className="text-sm text-muted-foreground">Menganalisis lamaran...</span>
    </div>
  );

  if (!data?.ranked?.length) return (
    <p className="text-sm text-muted-foreground text-center py-3">Belum ada lamaran untuk diranking</p>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10">
        <Brain className="h-4 w-4 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Diranking berdasarkan: Rating (30pt) + Pengalaman (20pt) + Kesesuaian Harga (20pt) + Level SKK (15pt) + Verifikasi (15pt)
        </p>
      </div>

      {data.ranked.map((r: any, i: number) => (
        <Card key={r.applicationId} className={`border ${i === 0 ? "border-amber-200 bg-amber-50/30" : "border-border/60"}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{getInitials(r.applicantName)}</AvatarFallback>
                  </Avatar>
                  {i === 0 && (
                    <div className="absolute -top-1 -right-1 bg-amber-400 rounded-full h-4 w-4 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{r.applicantName}</p>
                    {r.badge && (
                      <Badge variant="outline" className={`text-xs gap-1 ${BADGE_STYLE[r.badge]}`}>
                        {BADGE_ICON[r.badge]}
                        {r.badge}
                      </Badge>
                    )}
                    {r.profile?.isVerified && (
                      <Badge variant="outline" className="text-xs border-green-200 text-green-700">✓ Verified</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                    {r.profile?.rating > 0 && (
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-400" />{r.profile.rating.toFixed(1)} ({r.profile.ratingCount})</span>
                    )}
                    {r.profile?.completedProjects > 0 && (
                      <span>{r.profile.completedProjects} proyek selesai</span>
                    )}
                    {r.profile?.kkniLevel && (
                      <span className="flex items-center gap-1"><Award className="h-3 w-3" />SKK {r.profile.kkniLevel.split(" - ")[0]}</span>
                    )}
                  </div>
                  {r.proposedBudget && (
                    <p className="text-sm font-semibold text-primary mt-1">
                      Tawaran: {formatCurrency(r.proposedBudget)}
                    </p>
                  )}
                  {r.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.message}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-lg font-bold ${r.totalScore >= 70 ? "text-green-600" : r.totalScore >= 50 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {r.totalScore}<span className="text-xs font-normal text-muted-foreground">/100</span>
                </div>
                <p className="text-xs text-muted-foreground">Skor Agen</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => navigate(`/experts/${r.applicantId}`)}>
                Lihat Profil
              </Button>
              {onAccept && jobStatus === "open" && (
                <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onAccept(r.applicationId, r.applicantId)}>
                  Terima
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
