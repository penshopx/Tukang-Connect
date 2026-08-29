import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateJob } from "@/hooks/useJobs";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { JOB_CATEGORIES } from "@/lib/constants";
import PriceSuggestWidget from "@/components/PriceSuggestWidget";
import { canonicalMoneyInput } from "@/lib/utils";

export default function JobCreate() {
  const [, navigate] = useLocation();
  const { data: user } = useUser();
  const { mutate: createJob, isPending } = useCreateJob();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    location: "",
    deadline: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p>Silakan masuk terlebih dahulu.</p>
        <Button onClick={() => navigate("/login")} className="mt-3">Masuk</Button>
      </div>
    );
  }

  if (user.role !== "pelanggan") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Hanya pelanggan yang dapat membuat proyek.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) return toast({ title: "Pilih kategori", variant: "destructive" });
    let budget: string;
    try {
      budget = canonicalMoneyInput(form.budget);
    } catch (error) {
      return toast({ title: "Anggaran tidak valid", description: (error as Error).message, variant: "destructive" });
    }
    createJob(
      {
        ...form,
        budget,
        deadline: form.deadline || null,
      },
      {
        onSuccess: (job: any) => {
          toast({ title: "Proyek Diposting!", description: "Tenaga ahli akan segera melamar." });
          navigate(`/jobs/${job.id}`);
        },
        onError: (err) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-6 hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Buat Proyek Baru</CardTitle>
          <p className="text-sm text-muted-foreground">Jelaskan kebutuhan konstruksi Anda secara detail</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1 block">Judul Proyek *</label>
              <Input
                placeholder="Contoh: Renovasi Dapur Modern"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Kategori *</label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori pekerjaan" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Deskripsi Proyek *</label>
              <Textarea
                placeholder="Jelaskan tentang proyek ini, termasuk ukuran, material yang diinginkan, dan detail lainnya..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Anggaran (Rp) *</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="50000000"
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value.replace(/\D/g, ""))}
                  required
                />
                {/* Agent: Price Suggestion — muncul otomatis setelah kategori & lokasi diisi */}
                <PriceSuggestWidget
                  category={form.category}
                  location={form.location}
                  budget={form.budget}
                  onApply={(value) => update("budget", value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Lokasi *</label>
                <Input
                  placeholder="Contoh: Jakarta Selatan"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Deadline (Opsional)</label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Memposting..." : "Posting Proyek"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
