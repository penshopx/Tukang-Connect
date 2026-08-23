import { useLocation } from "wouter";
import { FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContracts } from "@/hooks/useExperts";
import { useUser } from "@/hooks/useUser";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function ContractsPage() {
  const [, navigate] = useLocation();
  const { data: user } = useUser();
  const { data: contracts = [], isLoading } = useContracts();

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
      <p className="text-muted-foreground">Masuk untuk melihat kontrak Anda</p>
      <Button onClick={() => navigate("/login")} className="mt-3">Masuk</Button>
    </div>
  );

  const isTukang = user.role === "tukang";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Kontrak Saya</h1>
        <p className="text-muted-foreground text-sm">{contracts.length} kontrak ditemukan</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary mx-auto" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">Belum Ada Kontrak</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isTukang ? "Lamar proyek untuk mendapatkan kontrak" : "Hire tukang untuk membuat kontrak"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract: any) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/contracts/${contract.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                      {contract.clientSigned && contract.workerSigned && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Ditandatangani
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-base mb-1">{contract.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{contract.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{isTukang ? `Klien: ${contract.client?.fullName}` : `Tukang: ${contract.worker?.fullName}`}</span>
                      {contract.startDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(contract.startDate)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-primary">{formatCurrency(contract.totalValue)}</p>
                    {!contract.clientSigned || !contract.workerSigned ? (
                      <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" /> Belum lengkap
                      </p>
                    ) : null}
                    <Button size="sm" variant="outline" className="mt-2">Detail</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
