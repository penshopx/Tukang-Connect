import { useState } from "react";
import { AlertTriangle, Plus, Clock, CheckCircle2, Shield, ChevronRight, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDisputes, useCreateDispute, useContracts } from "@/hooks/useExperts";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatRelativeTime } from "@/lib/utils";

const DISPUTE_CATEGORIES = [
  { value: "keterlambatan", label: "⏱ Keterlambatan Pekerjaan", desc: "Pekerjaan tidak selesai sesuai jadwal yang disepakati" },
  { value: "kualitas", label: "🔍 Kualitas Tidak Sesuai", desc: "Hasil pekerjaan tidak memenuhi spesifikasi kontrak" },
  { value: "pembayaran", label: "💰 Masalah Pembayaran", desc: "Pembayaran tidak sesuai milestone atau tidak dibayar" },
  { value: "material", label: "🏗 Material Tidak Sesuai Spesifikasi", desc: "Material yang digunakan berbeda dari yang disepakati" },
  { value: "pemutusan", label: "❌ Pemutusan Kontrak Sepihak", desc: "Salah satu pihak menghentikan pekerjaan tanpa alasan jelas" },
  { value: "lainnya", label: "📋 Lainnya", desc: "Masalah lain yang tidak tercakup di atas" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; step: number }> = {
  open:         { label: "Dibuka",           color: "text-blue-600",  bg: "bg-blue-50 border-blue-200",   icon: <AlertTriangle className="h-4 w-4" />, step: 1 },
  under_review: { label: "Sedang Ditinjau",  color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: <Clock className="h-4 w-4" />,         step: 2 },
  resolved:     { label: "Diselesaikan",     color: "text-green-600", bg: "bg-green-50 border-green-200", icon: <CheckCircle2 className="h-4 w-4" />,   step: 3 },
};

const TIPS = [
  "Kumpulkan bukti: foto, pesan, kontrak, dan laporan progress",
  "Jelaskan kronologi masalah secara detail dan berurutan",
  "Lampirkan pasal kontrak yang dilanggar jika ada",
  "Tim mediasi kami akan menghubungi kedua pihak dalam 1-3 hari kerja",
];

export default function DisputesPage() {
  const { data: user } = useUser();
  const { data: disputes = [], isLoading } = useDisputes();
  const { data: contracts = [] } = useContracts();
  const { mutate: createDispute, isPending } = useCreateDispute();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contractId: "", category: "", reason: "" });

  const activeContracts = contracts.filter((c: any) => c.status === "active" || c.status === "disputed");

  const handleCreate = () => {
    if (!form.contractId || !form.category || !form.reason.trim()) {
      return toast({ title: "Isi semua field", description: "Pilih kontrak, kategori masalah, dan tuliskan kronologi kejadian.", variant: "destructive" });
    }
    if (form.reason.trim().length < 30) {
      return toast({ title: "Deskripsi terlalu singkat", description: "Jelaskan masalah minimal 30 karakter untuk proses mediasi yang efektif.", variant: "destructive" });
    }
    const selectedCat = DISPUTE_CATEGORIES.find(c => c.value === form.category);
    createDispute(
      { contractId: Number(form.contractId), reason: `[${selectedCat?.label || form.category}] ${form.reason}` },
      {
        onSuccess: () => {
          toast({ title: "Sengketa Dibuka ✓", description: "Tim mediator kami akan meninjau dan menghubungi kedua pihak dalam 1-3 hari kerja." });
          setOpen(false);
          setForm({ contractId: "", category: "", reason: "" });
        },
        onError: () => toast({ title: "Gagal membuka sengketa", variant: "destructive" }),
      }
    );
  };

  const getCategoryLabel = (reason: string) => {
    const match = reason.match(/^\[(.*?)\]/);
    return match ? match[1] : null;
  };

  const getCleanReason = (reason: string) => reason.replace(/^\[.*?\]\s*/, "");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Pusat Sengketa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Resolusi sengketa proyek yang adil dan transparan</p>
        </div>
        {user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Buka Sengketa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Buka Sengketa Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Tips */}
                <div className="p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs font-semibold text-blue-800 mb-2">💡 Tips untuk proses mediasi yang lebih cepat:</p>
                  {TIPS.map((tip, i) => (
                    <p key={i} className="text-xs text-blue-700 flex gap-1.5 mb-1"><span className="shrink-0">•</span>{tip}</p>
                  ))}
                </div>

                {/* Contract Selection */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Kontrak yang Bermasalah <span className="text-red-500">*</span></label>
                  {activeContracts.length > 0 ? (
                    <Select value={form.contractId} onValueChange={(v) => setForm(f => ({ ...f, contractId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kontrak..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeContracts.map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            #{c.id} — {c.title} ({c.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 bg-muted rounded-xl text-sm text-muted-foreground">
                      Tidak ada kontrak aktif. Sengketa hanya bisa dibuka untuk kontrak yang aktif.
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Kategori Masalah <span className="text-red-500">*</span></label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis masalah..." /></SelectTrigger>
                    <SelectContent>
                      {DISPUTE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div>
                            <p className="font-medium text-sm">{cat.label}</p>
                            <p className="text-xs text-muted-foreground">{cat.desc}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Kronologi & Deskripsi Masalah <span className="text-red-500">*</span></label>
                  <Textarea
                    placeholder="Jelaskan secara detail: kapan masalah terjadi, apa yang terjadi, apa yang sudah dicoba untuk diselesaikan, dan apa yang Anda harapkan..."
                    value={form.reason}
                    onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{form.reason.length} karakter (minimal 30)</p>
                </div>

                <Button className="w-full" onClick={handleCreate} disabled={isPending || !activeContracts.length}>
                  {isPending ? "Membuka sengketa..." : "Buka Sengketa"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* How it works */}
      <Card className="mb-6 bg-gradient-to-r from-primary/5 to-indigo-50 border-none shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm font-semibold mb-3">Bagaimana Proses Mediasi Kami?</p>
          <div className="grid sm:grid-cols-4 gap-3">
            {[
              { step: 1, icon: <AlertTriangle className="h-4 w-4" />, title: "Buka Sengketa", desc: "Ajukan sengketa dengan bukti" },
              { step: 2, icon: <MessageSquare className="h-4 w-4" />, title: "Mediasi", desc: "Tim kami hubungi kedua pihak" },
              { step: 3, icon: <FileText className="h-4 w-4" />, title: "Tinjauan Kontrak", desc: "Analisis berdasarkan kontrak & milestone" },
              { step: 4, icon: <CheckCircle2 className="h-4 w-4" />, title: "Resolusi", desc: "Keputusan adil & mengikat" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-2.5">
                <div className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{s.step}</div>
                <div>
                  <div className="flex items-center gap-1 text-primary mb-0.5">{s.icon}<p className="text-xs font-semibold">{s.title}</p></div>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      {isLoading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary mx-auto" /></div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-emerald-50 p-4 rounded-2xl w-fit mx-auto mb-4">
            <Shield className="h-12 w-12 text-emerald-500" />
          </div>
          <p className="font-semibold text-lg">Tidak ada sengketa aktif</p>
          <p className="text-sm text-muted-foreground mt-1">Semoga semua proyek Anda berjalan lancar! 🏗️</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">{disputes.length} sengketa terdaftar</p>
          {disputes.map((dispute: any) => {
            const status = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
            const catLabel = getCategoryLabel(dispute.reason);
            const cleanReason = getCleanReason(dispute.reason);
            const contractInfo = contracts.find((c: any) => c.id === dispute.contractId);

            return (
              <Card key={dispute.id} className={`border ${status.bg}`}>
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${status.color}`}>{status.icon}</div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">Sengketa #{dispute.id}</span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(dispute.createdAt)}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">Kontrak #{dispute.contractId}</Badge>
                  </div>

                  {/* Contract info */}
                  {contractInfo && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 bg-white/60 rounded-lg px-2.5 py-1.5 w-fit">
                      <FileText className="h-3 w-3" />
                      {contractInfo.title}
                    </div>
                  )}

                  {/* Category badge */}
                  {catLabel && (
                    <span className="inline-block text-xs bg-white border rounded-full px-2.5 py-0.5 mb-2 font-medium">{catLabel}</span>
                  )}

                  {/* Reason */}
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{cleanReason}</p>

                  {/* Resolution */}
                  {dispute.resolution && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-semibold text-emerald-700">Resolusi Mediator:</span>
                      </div>
                      <p className="text-sm text-emerald-800">{dispute.resolution}</p>
                    </div>
                  )}

                  {/* Progress Steps */}
                  <div className="mt-4 flex items-center gap-1">
                    {["Dibuka", "Ditinjau", "Diselesaikan"].map((step, i) => (
                      <div key={step} className="flex items-center gap-1 flex-1">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${status.step > i ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                          {status.step > i ? "✓" : i + 1}
                        </div>
                        <span className={`text-xs ${status.step > i ? "text-primary font-medium" : "text-muted-foreground"}`}>{step}</span>
                        {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
