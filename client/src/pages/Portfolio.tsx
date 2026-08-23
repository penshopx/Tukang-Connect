import { useState } from "react";
import { Plus, Briefcase, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePortfolio, useCreatePortfolioItem } from "@/hooks/useExperts";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

export default function PortfolioPage() {
  const { data: user } = useUser();
  const { data: items = [], isLoading } = usePortfolio();
  const { mutate: createItem } = useCreatePortfolioItem();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "", completedAt: "", clientName: "" });

  const handleCreate = () => {
    if (!form.title || !form.category) return toast({ title: "Isi field wajib", variant: "destructive" });
    createItem(form as any, {
      onSuccess: () => {
        toast({ title: "Portfolio ditambahkan!" });
        setOpen(false);
        setForm({ title: "", description: "", category: "", completedAt: "", clientName: "" });
      },
      onError: () => toast({ title: "Gagal", variant: "destructive" }),
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/portfolio/${id}`);
      toast({ title: "Portfolio dihapus" });
      qc.invalidateQueries({ queryKey: ["/api/portfolio"] });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  if (user?.role !== "tukang") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Halaman ini hanya untuk tenaga ahli.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Saya</h1>
          <p className="text-muted-foreground text-sm">{items.length} proyek ditampilkan</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Portfolio</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Portfolio Baru</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Judul Proyek *</label>
                <Input placeholder="Contoh: Renovasi Rumah Minimalis" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Kategori *</label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>{JOB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Deskripsi</label>
                <Textarea placeholder="Jelaskan proyek ini..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Tanggal Selesai</label>
                  <Input type="date" value={form.completedAt} onChange={(e) => setForm(f => ({ ...f, completedAt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nama Klien</label>
                  <Input placeholder="Opsional" value={form.clientName} onChange={(e) => setForm(f => ({ ...f, clientName: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate}>Tambah ke Portfolio</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">Portfolio masih kosong</p>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan proyek yang sudah Anda selesaikan</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item: any) => (
            <Card key={item.id} className="group hover:shadow-md transition-shadow">
              <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-t-xl h-36 flex items-center justify-center">
                <Briefcase className="h-10 w-10 text-primary/40" />
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex-1">{item.title}</h3>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                  {item.completedAt && <span className="text-xs text-muted-foreground">{formatDate(item.completedAt)}</span>}
                </div>
                {item.clientName && <p className="text-xs text-muted-foreground mt-2">Klien: {item.clientName}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
