import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type HealthResponse = {
  status: "ok" | "degraded";
  code?: string;
  error?: string;
};

export default function DatabaseStatusBanner() {
  const { data, error, isFetching, refetch } = useQuery<HealthResponse>({
    queryKey: ["/api/health"],
    queryFn: async () => {
      const response = await fetch("/api/health", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Layanan sedang tidak tersedia");
      }
      return body;
    },
    retry: false,
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  if (!error && data?.status === "ok") return null;
  if (!error && !data) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Layanan sedang mengalami gangguan</p>
            <p className="text-xs text-amber-800">
              Database sedang tidak dapat dijangkau. Data mungkin belum terbaru. Silakan coba lagi sebentar.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2 border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          {isFetching ? "Mengecek..." : "Coba lagi"}
        </Button>
      </div>
    </div>
  );
}