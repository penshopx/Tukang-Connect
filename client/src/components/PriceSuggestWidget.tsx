import { useState } from "react";
import { Brain, TrendingUp, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useAgentPriceSuggest } from "@/hooks/useAgents";

interface Props {
  category: string;
  location: string;
  budget?: string;
  onApply?: (value: string) => void;
}

export default function PriceSuggestWidget({ category, location, budget, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const { mutate, data, isPending } = useAgentPriceSuggest();

  const handleSuggest = () => {
    if (!category || !location) return;
    mutate({ category, location, existingBudget: budget || undefined });
    setOpen(true);
  };

  if (!category || !location) return null;

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
        onClick={handleSuggest}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
        Saran Harga Pasar
        {open && data ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {open && data && (
        <div className="mt-3 p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Saran Harga: {data.category} di {data.location}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white rounded-lg border border-border/60">
              <p className="text-xs text-muted-foreground mb-0.5">Minimum</p>
              <p className="text-sm font-bold text-muted-foreground">{formatCurrency(data.adjustedMin)}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary mb-0.5">Rekomendasi</p>
              <p className="text-sm font-bold text-primary">{formatCurrency(data.adjustedMid)}</p>
            </div>
            <div className="p-2 bg-white rounded-lg border border-border/60">
              <p className="text-xs text-muted-foreground mb-0.5">Premium</p>
              <p className="text-sm font-bold text-muted-foreground">{formatCurrency(data.adjustedMax)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">Satuan: <span className="font-medium">{data.unit}</span></p>

          {data.locationMultiplier !== 1.0 && (
            <p className="text-xs text-muted-foreground text-center">
              Indeks biaya lokasi: <span className="font-medium">{(data.locationMultiplier * 100).toFixed(0)}%</span> dari nasional
            </p>
          )}

          {data.tips?.length > 0 && (
            <div className="space-y-1">
              {data.tips.map((tip: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground">• {tip}</p>
              ))}
            </div>
          )}

          {onApply && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full text-xs mt-1"
              onClick={() => onApply(String(data.adjustedMid))}
            >
              Gunakan Harga Rekomendasi ({formatCurrency(data.adjustedMid)})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
