import { useState } from "react";
import { Brain, Loader2, CheckCircle, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAgentMilestones } from "@/hooks/useAgents";

interface MilestoneSuggestion {
  title: string;
  description: string;
  amount: string;
  percentage: number;
  estimatedDays: number;
  dueDate: string;
}

interface Props {
  category: string;
  budget: string;
  startDate?: string;
  onApply?: (milestones: MilestoneSuggestion[]) => void;
}

export default function MilestoneGeneratorWidget({ category, budget, startDate, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const { mutate, data, isPending } = useAgentMilestones();

  const handleGenerate = () => {
    mutate({ category, budget, startDate }, {
      onSuccess: () => setOpen(true),
    });
  };

  if (!category || !budget) return null;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
        onClick={handleGenerate}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
        Generate Milestone Otomatis
      </Button>

      {open && data?.milestones?.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 bg-primary/5 rounded-lg border border-primary/10">
            <Brain className="h-3 w-3 text-primary" />
            <p className="text-xs text-primary font-medium">
              {data.milestones.length} milestone untuk {data.category} · Total {formatCurrency(data.budget)}
            </p>
          </div>
          {data.milestones.map((m: MilestoneSuggestion, i: number) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="font-semibold text-sm">{m.title}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.percentage}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-7">{m.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 ml-7 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {m.dueDate}</span>
                      <span>±{m.estimatedDays} hari</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm text-primary">{formatCurrency(m.amount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {onApply && (
            <Button
              type="button"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => onApply(data.milestones)}
            >
              <Plus className="h-3 w-3" /> Gunakan Semua Milestone Ini
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
