import { useMemo, useState } from "react";
import { Plus, Briefcase, Trash2, Search, FolderKanban, CalendarDays } from "lucide-react";
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
import type { PortfolioItem } from "@shared/types";

export default function PortfolioPage() {
  const { data: user } = useUser();
  const { data: items = [], isLoading } = usePortfolio();
  const portfolioItems = items as PortfolioItem[];
  const { mutate: createItem } = useCreatePortfolioItem();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", category: "", completedAt: "", clientName: "" });

  const categories = useMemo(
    () => [...new Set(portfolioItems.map((item) => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id")),
    [portfolioItems],
  );
  const latestCompletedAt = useMemo(
    () => portfolioItems
      .map((item) => item.completedAt)
      .filter((date) => date && Number.isFinite(new Date(date).getTime()))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0],
    [portfolioItems],
  );
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return portfolioItems
      .filter((item) => {
        const matchesCategory = category === "all" || item.category === category;
        const searchableText = [item.title, item.category, item.description, item.clientName]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("id");
        return matchesCategory && (!query || searchableText.includes(query));
      })
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return (Number.isFinite(dateB) ? dateB : 0) - (Number.isFinite(dateA) ? dateA : 0);
      });
  }, [portfolioItems, search, category]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ruang Proyek</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola dan tampilkan pengalaman proyek Anda kepada calon klien.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 self-start sm:self-auto"><Plus className="h-4 w-4" /> Tambah Proyek</Button>
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
      ) : portfolioItems.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">Ruang proyek Anda masih kosong</p>
          <p className="text-sm text-muted-foreground mt-1">Tambahkan proyek yang sudah Anda selesaikan</p>
          <Button className="mt-4 gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Tambah proyek pertama</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2"><Briefcase className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xl font-bold">{portfolioItems.length}</p><p className="text-xs text-muted-foreground">Proyek tersimpan</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-500/10 p-2"><FolderKanban className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-xl font-bold">{categories.length}</p><p className="text-xs text-muted-foreground">Kategori pekerjaan</p></div>
              </CardContent>
            </Card>
            <Card className="col-span-2 sm:col-span-1">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2"><CalendarDays className="h-5 w-5 text-emerald-600" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {latestCompletedAt ? formatDate(latestCompletedAt) : "Belum dicatat"}
                  </p>
                  <p className="text-xs text-muted-foreground">Proyek terbaru</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Cari proyek"
                placeholder="Cari judul, kategori, deskripsi, atau klien..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filter kategori" className="sm:w-56">
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground mb-3" aria-live="polite">
            Menampilkan {filteredItems.length} dari {portfolioItems.length} proyek
          </p>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 px-4 text-center">
              <Search className="h-9 w-9 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">Proyek tidak ditemukan</p>
              <p className="text-sm text-muted-foreground mt-1">Coba kata kunci atau kategori yang berbeda.</p>
              <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCategory("all"); }}>
                Hapus filter
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => (
                <Card key={item.id} className="group hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-br from-primary/15 to-primary/5 rounded-t-xl h-36 flex items-center justify-center">
                    <Briefcase className="h-10 w-10 text-primary/40" />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="font-semibold text-sm flex-1">{item.title}</h3>
                      <button
                        type="button"
                        aria-label={`Hapus proyek ${item.title}`}
                        onClick={() => handleDelete(item.id)}
                        className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      {item.completedAt && <span className="text-xs text-muted-foreground">{formatDate(item.completedAt)}</span>}
                    </div>
                    {item.clientName && <p className="text-xs text-muted-foreground mt-2">Klien: {item.clientName}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
