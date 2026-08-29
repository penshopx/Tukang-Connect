import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, Plus, FileText, AlertTriangle, Star, Trophy, Clock, DollarSign, User, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContract, useSignContract, useCompleteContract, useCreateReview } from "@/hooks/useExperts";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { addMoney, formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "Menunggu", color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: <Clock className="h-4 w-4 text-slate-400" /> },
  in_progress: { label: "Sedang Dikerjakan", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: <Clock className="h-4 w-4 text-blue-500" /> },
  submitted: { label: "Menunggu Persetujuan", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle className="h-4 w-4 text-amber-500" /> },
  approved: { label: "Disetujui", color: "text-green-600", bg: "bg-green-50 border-green-200", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  rejected: { label: "Perlu Revisi", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
};

export default function ContractDetail() {
  const [, params] = useRoute("/contracts/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);
  const { data: user } = useUser();
  const { data: contract, isLoading } = useContract(id);
  const { mutate: signContract, isPending: signing } = useSignContract();
  const { mutate: completeContract, isPending: completing } = useCompleteContract();
  const { mutate: createReview, isPending: reviewing } = useCreateReview();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", amount: "", dueDate: "" });
  const [reportForm, setReportForm] = useState({ title: "", description: "", type: "progress" });
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [rejectNotes, setRejectNotes] = useState<Record<number, string>>({});

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary" /></div>;
  if (!contract) return <div className="text-center py-12 text-muted-foreground">Kontrak tidak ditemukan</div>;

  const isClient = user?.id === contract.clientId;
  const isWorker = user?.id === contract.workerId;
  const hasUserSigned = isClient ? contract.clientSigned : contract.workerSigned;

  const milestones: any[] = contract.milestones || [];
  const completedMilestones = milestones.filter((m) => m.status === "approved").length;
  const totalMilestones = milestones.length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  const earnedValue = addMoney(...milestones.filter((m) => m.status === "approved").map((m: any) => m.amount));
  const pendingValue = addMoney(...milestones.filter((m) => m.status !== "approved").map((m: any) => m.amount));
  const incompleteMilestones = milestones.filter((m) => m.status !== "approved");
  const blockedStatusLabels = [...new Set(
    incompleteMilestones.map((m) => MILESTONE_STATUS_CONFIG[m.status]?.label || m.status)
  )].join(", ");
  const completionBlockReason = incompleteMilestones.length > 0
    ? `Kontrak belum dapat diselesaikan: ${incompleteMilestones.length} milestone belum disetujui (${blockedStatusLabels}).`
    : null;
  const canComplete = isClient && contract.status === "active" && incompleteMilestones.length === 0;

  const handleSign = () => {
    signContract(id, {
      onSuccess: () => {
        toast({ title: "Kontrak Ditandatangani!", description: "Kontrak telah ditandatangani secara digital." });
        qc.invalidateQueries({ queryKey: ["/api/contracts", id] });
      },
      onError: () => toast({ title: "Gagal", variant: "destructive" }),
    });
  };

  const handleComplete = () => {
    completeContract(id, {
      onSuccess: (data: any) => {
        toast({ title: "Proyek Selesai! 🎉", description: "Kontrak berhasil diselesaikan. Berikan ulasan untuk tukang!" });
        qc.invalidateQueries({ queryKey: ["/api/contracts", id] });
        setReviewOpen(true);
      },
      onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
    });
  };

  const handleAddMilestone = async () => {
    if (!/^[1-9]\d*$/.test(milestoneForm.amount)) {
      toast({ title: "Jumlah harus berupa nominal positif", variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", `/api/contracts/${id}/milestones`, {
        ...milestoneForm,
        amount: milestoneForm.amount,
        status: "in_progress",
      });
      toast({ title: "Milestone ditambahkan" });
      setMilestoneOpen(false);
      setMilestoneForm({ title: "", description: "", amount: "", dueDate: "" });
      qc.invalidateQueries({ queryKey: ["/api/contracts", id] });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const handleMilestoneAction = async (msId: number, action: string, notes?: string) => {
    try {
      await apiRequest("PUT", `/api/milestones/${msId}/${action}`, { notes });
      const labels: Record<string, string> = { approve: "Milestone Disetujui ✓", submit: "Milestone Diajukan", reject: "Revisi Diminta" };
      toast({ title: labels[action] || "Berhasil" });
      qc.invalidateQueries({ queryKey: ["/api/contracts", id] });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const handleAddReport = async () => {
    try {
      await apiRequest("POST", `/api/contracts/${id}/reports`, reportForm);
      toast({ title: "Laporan Dibuat" });
      setReportOpen(false);
      setReportForm({ title: "", description: "", type: "progress" });
      qc.invalidateQueries({ queryKey: ["/api/contracts", id] });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const handleSubmitReview = () => {
    if (!reviewComment.trim()) {
      toast({ title: "Tulis komentar ulasan terlebih dahulu", variant: "destructive" });
      return;
    }
    createReview(
      { workerId: contract.workerId, rating: reviewRating, comment: reviewComment, jobId: contract.jobId },
      {
        onSuccess: () => {
          toast({ title: "Ulasan Dikirim! ⭐", description: "Terima kasih sudah memberikan ulasan." });
          setReviewOpen(false);
        },
        onError: () => toast({ title: "Gagal mengirim ulasan", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/contracts")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Kontrak
        </button>
        <Button
          className="gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-md"
          onClick={() => navigate(`/contracts/${id}/brain`)}
        >
          <Brain className="h-4 w-4" />
          Brain Project
          <Zap className="h-3.5 w-3.5 text-yellow-300" />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="shadow-sm">
            <div className="bg-primary/5 p-6 border-b rounded-t-xl">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(contract.status)}`}>
                  {getStatusLabel(contract.status)}
                </span>
                <div className="flex gap-2 flex-wrap">
                  {contract.clientSigned && <Badge className="bg-green-100 text-green-700 border-none text-xs">Klien ✓</Badge>}
                  {contract.workerSigned && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">Tukang ✓</Badge>}
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2">{contract.title}</h1>
              <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Klien: <strong>{contract.client?.fullName}</strong></span>
                <span className="flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> Tukang: <strong>{contract.worker?.fullName}</strong></span>
                {contract.startDate && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Mulai: {formatDate(contract.startDate)}</span>}
              </div>
            </div>
            <CardContent className="p-6">
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">{contract.description}</p>

              {/* Progress + payment summary */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Progress Milestone</span>
                  <span className="text-muted-foreground">{completedMilestones}/{totalMilestones} selesai</span>
                </div>
                <Progress value={progress} className="h-2.5" />
                {totalMilestones > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-xs text-green-600 mb-0.5">Sudah Dibayar</p>
                      <p className="font-bold text-green-700">{formatCurrency(earnedValue)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-500 mb-0.5">Tersisa</p>
                      <p className="font-bold text-slate-700">{formatCurrency(pendingValue)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="milestones">
            <TabsList>
              <TabsTrigger value="milestones">Milestone ({totalMilestones})</TabsTrigger>
              <TabsTrigger value="reports">Laporan ({contract.reports?.length || 0})</TabsTrigger>
            </TabsList>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Milestone Pembayaran</h3>
                {isClient && contract.status === "active" && (
                  <Dialog open={milestoneOpen} onOpenChange={setMilestoneOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Tambah</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Tambah Milestone</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Judul Milestone</label>
                          <Input value={milestoneForm.title} onChange={(e) => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="Contoh: Pekerjaan Pondasi" />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Deskripsi</label>
                          <Textarea value={milestoneForm.description} onChange={(e) => setMilestoneForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Jumlah (Rp)</label>
                            <Input type="text" inputMode="numeric" pattern="\d*" value={milestoneForm.amount} onChange={(e) => setMilestoneForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, "") }))} placeholder="5000000" />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Tenggat Waktu</label>
                            <Input type="date" value={milestoneForm.dueDate} onChange={(e) => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} />
                          </div>
                        </div>
                        <Button className="w-full" onClick={handleAddMilestone}>Tambah Milestone</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Belum ada milestone. Milestone membantu mengatur pembayaran bertahap.</p>
                  </div>
                ) : (
                  milestones.map((ms: any, idx: number) => {
                    const cfg = MILESTONE_STATUS_CONFIG[ms.status] || MILESTONE_STATUS_CONFIG.pending;
                    return (
                      <Card key={ms.id} className={`border ${cfg.bg}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="mt-0.5">{cfg.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                                  <p className="font-semibold text-sm">{ms.title}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.bg} ${cfg.color}`}>
                                    {cfg.label}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{ms.description}</p>
                                {ms.dueDate && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Tenggat: {formatDate(ms.dueDate)}
                                  </p>
                                )}
                                {ms.notes && <p className="text-xs mt-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">📝 {ms.notes}</p>}
                                {ms.status === "submitted" && isClient && (
                                  <div className="mt-2">
                                    <Input
                                      placeholder="Catatan revisi (jika ditolak)..."
                                      className="text-xs h-8"
                                      value={rejectNotes[ms.id] || ""}
                                      onChange={(e) => setRejectNotes(prev => ({ ...prev, [ms.id]: e.target.value }))}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-sm text-primary">{formatCurrency(ms.amount)}</p>
                              <div className="flex gap-1 mt-2 flex-wrap justify-end">
                                {isWorker && ms.status === "in_progress" && (
                                  <Button size="sm" onClick={() => handleMilestoneAction(ms.id, "submit")}>
                                    Ajukan Selesai
                                  </Button>
                                )}
                                {isWorker && ms.status === "rejected" && (
                                  <Button size="sm" variant="outline" onClick={() => handleMilestoneAction(ms.id, "submit")}>
                                    Ajukan Ulang
                                  </Button>
                                )}
                                {isClient && ms.status === "submitted" && (
                                  <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleMilestoneAction(ms.id, "approve")}>
                                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Setujui
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleMilestoneAction(ms.id, "reject", rejectNotes[ms.id] || "Perlu revisi")}>
                                      Revisi
                                    </Button>
                                  </>
                                )}
                                {ms.status === "approved" && ms.completedAt && (
                                  <p className="text-xs text-green-600 mt-1">✓ {formatDate(ms.completedAt)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Complete Contract CTA */}
              {canComplete && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 text-sm">Semua milestone sudah disetujui!</p>
                      <p className="text-xs text-green-700">Selesaikan kontrak untuk merilis pembayaran penuh dan berikan ulasan.</p>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700 flex-shrink-0" onClick={handleComplete} disabled={completing}>
                      {completing ? "Memproses..." : "Selesaikan Kontrak"}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Laporan Proyek</h3>
                <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Buat Laporan</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Buat Laporan Baru</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Judul</label>
                        <Input value={reportForm.title} onChange={(e) => setReportForm(f => ({ ...f, title: e.target.value }))} placeholder="Contoh: Progress Minggu 1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Tipe</label>
                        <select value={reportForm.type} onChange={(e) => setReportForm(f => ({ ...f, type: e.target.value }))} className="w-full h-10 rounded-lg border border-input px-3 text-sm">
                          <option value="progress">Laporan Progress</option>
                          <option value="problem">Laporan Masalah</option>
                          <option value="completion">Laporan Penyelesaian</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Deskripsi</label>
                        <Textarea value={reportForm.description} onChange={(e) => setReportForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Jelaskan detail laporan..." />
                      </div>
                      <Button className="w-full" onClick={handleAddReport}>Kirim Laporan</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-3">
                {contract.reports?.length === 0 ? (
                  <p className="text-center py-6 text-sm text-muted-foreground">Belum Ada Laporan</p>
                ) : (
                  contract.reports?.map((report: any) => (
                    <Card key={report.id} className="border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{report.title}</h4>
                          <Badge variant="secondary" className="text-xs capitalize">{report.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">{formatDate(report.createdAt)}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-3xl font-bold text-primary mb-1">{formatCurrency(contract.totalValue)}</p>
              <p className="text-sm text-muted-foreground mb-4">Total Nilai Kontrak</p>

              {contract.status === "active" && !hasUserSigned && (
                <Button className="w-full mb-2" onClick={handleSign} disabled={signing}>
                  <FileText className="h-4 w-4 mr-2" />
                  {signing ? "Menandatangani..." : "Tandatangani Kontrak"}
                </Button>
              )}

              {hasUserSigned && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm mb-2">
                  <CheckCircle className="h-4 w-4" /> Anda sudah menandatangani
                </div>
              )}

              {contract.status === "active" && isClient && !canComplete && totalMilestones > 0 && (
                <div className="p-3 bg-blue-50 rounded-xl text-blue-700 text-xs mb-2">
                  {completionBlockReason} ({completedMilestones}/{totalMilestones} disetujui)
                </div>
              )}

              {contract.status === "completed" && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm mb-2">
                  <Trophy className="h-4 w-4" /> Kontrak Selesai
                </div>
              )}

              {contract.status === "completed" && isClient && (
                <Button variant="outline" className="w-full gap-2 mb-2" onClick={() => setReviewOpen(true)}>
                  <Star className="h-4 w-4 text-amber-500" /> Beri Ulasan Tukang
                </Button>
              )}

              <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/disputes")}>
                <AlertTriangle className="h-4 w-4" /> Buka Sengketa
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Klien</p>
                <p className="font-semibold text-sm">{contract.client?.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tukang</p>
                <p className="font-semibold text-sm cursor-pointer text-primary hover:underline" onClick={() => navigate(`/experts/${contract.workerId}`)}>
                  {contract.worker?.fullName}
                </p>
              </div>
              {contract.startDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Mulai</p>
                  <p className="font-semibold text-sm">{formatDate(contract.startDate)}</p>
                </div>
              )}
              {contract.endDate && (
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Selesai</p>
                  <p className="font-semibold text-sm">{formatDate(contract.endDate)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Milestone Progress</p>
                <p className="font-semibold text-sm">{completedMilestones} / {totalMilestones} selesai</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> Beri Ulasan untuk {contract.worker?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating Bintang</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-3xl transition-transform hover:scale-110 ${star <= reviewRating ? "text-amber-400" : "text-slate-200"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {reviewRating === 5 ? "Luar biasa!" : reviewRating === 4 ? "Sangat baik" : reviewRating === 3 ? "Cukup baik" : reviewRating === 2 ? "Kurang memuaskan" : "Tidak memuaskan"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Komentar</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Bagaimana pengalaman Anda bekerja dengan tukang ini? Ceritakan kualitas pekerjaan, ketepatan waktu, komunikasi, dll."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleSubmitReview} disabled={reviewing}>
                {reviewing ? "Mengirim..." : "Kirim Ulasan"}
              </Button>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>Lewati</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
