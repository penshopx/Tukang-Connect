import { Link } from "wouter";
import { Brain, TrendingUp, AlertCircle, CheckCircle, Info, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgentInsights } from "@/hooks/useAgents";
import { useUser } from "@/hooks/useUser";

const PRIORITY_STYLE = {
  high: { bg: "bg-red-50 border-red-100", icon: <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />, badge: "bg-red-100 text-red-700" },
  medium: { bg: "bg-amber-50 border-amber-100", icon: <TrendingUp className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />, badge: "bg-amber-100 text-amber-700" },
  low: { bg: "bg-blue-50 border-blue-100", icon: <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />, badge: "bg-blue-100 text-blue-700" },
};

const PRIORITY_LABEL = { high: "Penting", medium: "Perhatikan", low: "Info" };

export default function AgentInsightsPanel() {
  const { data: user } = useUser();
  const { data, isLoading } = useAgentInsights(!!user);

  if (!user || isLoading) return null;
  if (!data?.insights?.length) return null;

  return (
    <Card className="border-none shadow-sm bg-gradient-to-br from-primary/3 to-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          Rekomendasi Cerdas
          <Badge variant="outline" className="text-xs font-normal ml-auto border-primary/20 text-primary">
            {data.insights.length} insight
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {data.insights.slice(0, 4).map((insight: any, i: number) => {
          const style = PRIORITY_STYLE[insight.priority as keyof typeof PRIORITY_STYLE];
          return (
            <div key={i} className={`p-3 rounded-xl border ${style.bg} transition-all`}>
              <div className="flex items-start gap-2">
                {style.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <p className="font-medium text-sm">{insight.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.badge}`}>
                      {PRIORITY_LABEL[insight.priority as keyof typeof PRIORITY_LABEL]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight.message}</p>
                </div>
                {insight.link && (
                  <Link href={insight.link}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 mt-0.5 cursor-pointer" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground text-center pt-1 flex items-center justify-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Dianalisis otomatis oleh sistem agen KerjaProyek
        </p>
      </CardContent>
    </Card>
  );
}
