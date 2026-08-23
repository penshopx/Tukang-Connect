import { useLocation } from "wouter";
import { Brain, Star, MapPin, Award, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAgentMatchWorkers } from "@/hooks/useAgents";
import { getInitials, formatCurrency } from "@/lib/utils";

interface Props {
  jobId: number;
}

function ScoreBar({ value, max = 100, color = "bg-primary" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
    </div>
  );
}

export default function AgentMatchPanel({ jobId }: Props) {
  const [, navigate] = useLocation();
  const { data, isLoading } = useAgentMatchWorkers(jobId);

  return (
    <Card className="shadow-sm border-primary/10 bg-gradient-to-br from-primary/2 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Rekomendasi Pekerja
          <Badge variant="outline" className="text-xs ml-auto border-primary/20 text-primary font-normal">AI Match</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Menganalisis...</span>
          </div>
        ) : !data?.results?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Tidak ada pekerja yang cocok ditemukan</p>
        ) : (
          data.results.map((r: any) => (
            <div key={r.workerId} className="p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{getInitials(r.workerName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{r.workerName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {r.profile?.location && (
                      <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{r.profile.location}</span>
                    )}
                    {r.profile?.rating > 0 && (
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400" />{r.profile.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-bold ${r.totalScore >= 70 ? "text-green-600" : r.totalScore >= 50 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {r.totalScore}<span className="text-xs font-normal">/100</span>
                  </div>
                  {r.profile?.isVerified && <Badge variant="outline" className="text-xs border-green-200 text-green-700 mt-0.5">✓ Verified</Badge>}
                </div>
              </div>
              <ScoreBar value={r.totalScore} color={r.totalScore >= 70 ? "bg-green-500" : r.totalScore >= 50 ? "bg-amber-400" : "bg-muted-foreground"} />
              <div className="grid grid-cols-4 gap-1 mt-2 text-xs text-muted-foreground">
                <div className="text-center">
                  <p className="font-medium text-foreground">{r.breakdown.skills}</p>
                  <p>Keahlian</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{r.breakdown.location}</p>
                  <p>Lokasi</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{r.breakdown.rating}</p>
                  <p>Rating</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">{r.breakdown.experience}</p>
                  <p>Pengalaman</p>
                </div>
              </div>
              {r.profile?.kkniLevel && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Award className="h-3 w-3" /> SKK {r.profile.kkniLevel}
                </p>
              )}
              <p className="text-xs italic text-muted-foreground mt-1">{r.recommendation}</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 h-7 text-xs"
                onClick={() => navigate(`/experts/${r.workerId}`)}
              >
                Lihat Profil
              </Button>
            </div>
          ))
        )}
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Skor: Keahlian 40 + Lokasi 20 + SKK 15 + Rating 15 + Pengalaman 10
        </p>
      </CardContent>
    </Card>
  );
}
