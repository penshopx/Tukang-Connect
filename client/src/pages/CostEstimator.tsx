import { useState } from "react";
import { Calculator, TrendingUp, ChevronDown, ChevronUp, MapPin, Clock, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  allocateMoneyPercentage,
  formatCurrency,
  scaleMoney,
  subtractMoney,
} from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const LOCATIONS = [
  "Jakarta", "Bandung", "Surabaya", "Medan", "Semarang",
  "Yogyakarta", "Makassar", "Denpasar", "Bogor", "Bekasi",
  "Depok", "Tangerang", "Malang", "Solo", "Lainnya",
];

const LOCATION_FACTOR: Record<string, number> = {
  "Jakarta": 1.35, "Denpasar": 1.20, "Surabaya": 1.10, "Bandung": 1.05,
  "Semarang": 1.0, "Malang": 1.0, "Bogor": 1.0, "Bekasi": 1.05,
  "Depok": 1.05, "Tangerang": 1.10, "Yogyakarta": 0.95, "Solo": 0.95,
  "Medan": 0.95, "Makassar": 0.90, "Lainnya": 1.0,
};

const MATERIAL_BREAKDOWN: Record<string, Array<{ item: string; portion: number; unit: string }>> = {
  "Renovasi":       [{ item: "Pasir & Semen", portion: 25, unit: "material" }, { item: "Keramik & Granit", portion: 30, unit: "material" }, { item: "Cat & Plamir", portion: 15, unit: "material" }, { item: "Rangka & Kayu", portion: 20, unit: "material" }, { item: "Aksesoris", portion: 10, unit: "material" }],
  "Konstruksi Baru":[{ item: "Besi Beton & Baja", portion: 30, unit: "material" }, { item: "Semen & Beton", portion: 25, unit: "material" }, { item: "Bata & Dinding", portion: 15, unit: "material" }, { item: "Atap & Rangka", portion: 20, unit: "material" }, { item: "Kusen & Pintu", portion: 10, unit: "material" }],
  "Pengecatan":     [{ item: "Cat Dasar / Primer", portion: 20, unit: "material" }, { item: "Cat Finish", portion: 60, unit: "material" }, { item: "Plamir & Dempul", portion: 12, unit: "material" }, { item: "Kuas & Roller", portion: 8, unit: "material" }],
  "Lantai":         [{ item: "Keramik / Granit", portion: 55, unit: "material" }, { item: "Semen & Pasir", portion: 25, unit: "material" }, { item: "Nat & Grouting", portion: 10, unit: "material" }, { item: "Lem Keramik", portion: 10, unit: "material" }],
  "Listrik":        [{ item: "Kabel & Konduit", portion: 40, unit: "material" }, { item: "Panel MCB", portion: 25, unit: "material" }, { item: "Stop Kontak & Saklar", portion: 20, unit: "material" }, { item: "Fitting Lampu", portion: 15, unit: "material" }],
  "Plambing":       [{ item: "Pipa PPRC & PVC", portion: 45, unit: "material" }, { item: "Fitting & Kran", portion: 30, unit: "material" }, { item: "Sanitair & WC", portion: 15, unit: "material" }, { item: "Semen & Aksesoris", portion: 10, unit: "material" }],
  "Atap":           [{ item: "Genteng / Penutup Atap", portion: 35, unit: "material" }, { item: "Rangka Baja Ringan", portion: 40, unit: "material" }, { item: "Talang & Drainase", portion: 15, unit: "material" }, { item: "Waterproofing", portion: 10, unit: "material" }],
  "Pondasi":        [{ item: "Besi Beton", portion: 35, unit: "material" }, { item: "Beton / Semen", portion: 40, unit: "material" }, { item: "Pasir & Kerikil", portion: 15, unit: "material" }, { item: "Bekisting", portion: 10, unit: "material" }],
};

const TIMELINE_ESTIMATE: Record<string, { base: number; unit: string; perM2: number }> = {
  "Renovasi":       { base: 7, unit: "hari", perM2: 0.5 },
  "Konstruksi Baru":{ base: 30, unit: "hari", perM2: 2 },
  "Pengecatan":     { base: 3, unit: "hari", perM2: 0.2 },
  "Lantai":         { base: 5, unit: "hari", perM2: 0.3 },
  "Listrik":        { base: 5, unit: "hari", perM2: 0.15 },
  "Plambing":       { base: 5, unit: "hari", perM2: 0.2 },
  "Atap":           { base: 7, unit: "hari", perM2: 0.4 },
  "Pondasi":        { base: 14, unit: "hari", perM2: 0.5 },
  "Interior":       { base: 14, unit: "hari", perM2: 1 },
  "Las":            { base: 5, unit: "hari", perM2: 0.3 },
};

const QUALITY_CONFIG = [
  { value: "ekonomis", label: "Ekonomis", desc: "Material dasar, standar minimum", multiplier: 0.75, color: "border-slate-300" },
  { value: "standar",  label: "Standar",  desc: "Material menengah, SNI", multiplier: 1.0, color: "border-primary" },
  { value: "premium",  label: "Premium",  desc: "Material terbaik, finishing tinggi", multiplier: 1.5, color: "border-amber-500" },
];

export default function CostEstimatorPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "", area: "", quality: "standar", location: "Jakarta" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.area) return toast({ title: "Isi semua field yang wajib", variant: "destructive" });
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/estimates", form);
      const data = await res.json();
      const locationFactor = LOCATION_FACTOR[form.location] || 1.0;
      const locationPercent = Math.round(locationFactor * 100);
      const total = scaleMoney(data.total, locationPercent, 100);
      const laborCost = scaleMoney(data.laborCost, locationPercent, 100);
      const materialCost = scaleMoney(data.materialCost, locationPercent, 100);
      // Apply location factor on top of the result
      const adjusted = {
        ...data,
        laborCost: laborCost.toString(),
        materialCost: materialCost.toString(),
        overhead: subtractMoney(subtractMoney(total, laborCost), materialCost).toString(),
        total: total.toString(),
        perM2: scaleMoney(data.perM2, locationPercent, 100).toString(),
        locationFactor,
        area: Number(form.area),
        category: form.category,
        quality: form.quality,
        location: form.location,
      };
      setResult(adjusted);
      setShowBreakdown(false);
    } catch {
      toast({ title: "Gagal menghitung estimasi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const timeline = result ? TIMELINE_ESTIMATE[result.category] : null;
  const estimatedDays = timeline ? Math.ceil(timeline.base + timeline.perM2 * result.area) : 0;
  const materialBreakdown = result ? (MATERIAL_BREAKDOWN[result.category] || []) : [];
  const qConfig = QUALITY_CONFIG.find((q) => q.value === form.quality);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-8">
        <div className="bg-primary/10 p-4 rounded-2xl w-fit mx-auto mb-4">
          <Calculator className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Estimator Biaya Konstruksi</h1>
        <p className="text-muted-foreground">Hitung estimasi biaya proyek berdasarkan kategori, luas, kualitas, dan lokasi</p>
      </div>

      <Card className="shadow-sm mb-6">
        <CardContent className="p-6">
          <form onSubmit={handleEstimate} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Jenis Pekerjaan <span className="text-red-500">*</span></label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis pekerjaan" /></SelectTrigger>
                  <SelectContent>
                    {JOB_CATEGORIES.filter(c => c !== "Lainnya").map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Lokasi Proyek</label>
                <Select value={form.location} onValueChange={(v) => setForm(f => ({ ...f, location: v }))}>
                  <SelectTrigger>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>{l} {LOCATION_FACTOR[l] && LOCATION_FACTOR[l] !== 1.0 ? `(×${LOCATION_FACTOR[l].toFixed(2)})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Luas Area (m²) <span className="text-red-500">*</span></label>
              <Input type="number" placeholder="Contoh: 100" value={form.area}
                onChange={(e) => setForm(f => ({ ...f, area: e.target.value }))} min={1} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Kualitas Material</label>
              <div className="grid grid-cols-3 gap-3">
                {QUALITY_CONFIG.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, quality: opt.value }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${form.quality === opt.value ? `${opt.color} bg-primary/5` : "border-border hover:border-primary/40"}`}>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{opt.desc}</div>
                    <div className="text-xs font-medium text-primary mt-1">×{opt.multiplier}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Calculator className="h-4 w-4" />
              {loading ? "Menghitung..." : "Hitung Estimasi"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Total */}
          <Card className="shadow-sm border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-white/80" />
                  <span className="text-white/80 text-sm">Total Estimasi Biaya</span>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-white/20 text-white border-none text-xs">{result.category}</Badge>
                  <Badge className="bg-white/20 text-white border-none text-xs">{result.quality}</Badge>
                </div>
              </div>
              <p className="text-4xl font-black">{formatCurrency(result.total)}</p>
              <div className="flex gap-4 mt-2 text-white/70 text-sm">
                <span>{formatCurrency(result.perM2)}/m²</span>
                <span>·</span>
                <span>{result.area} m²</span>
                <span>·</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{result.location} (×{result.locationFactor.toFixed(2)})</span>
              </div>
            </div>
            <CardContent className="p-5">
              {/* Cost breakdown bars */}
              <div className="space-y-3 mb-4">
                {[
                  { label: "Biaya Material (55%)", value: result.materialCost, pct: 55, color: "bg-emerald-500" },
                  { label: "Biaya Tenaga Kerja (35%)", value: result.laborCost, pct: 35, color: "bg-blue-500" },
                  { label: "Overhead & Lain-lain (10%)", value: result.overhead, pct: 10, color: "bg-orange-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold">{formatCurrency(item.value)}</span>
                    </div>
                    <Progress value={item.pct} className="h-2" />
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {timeline && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-sm text-blue-800 mb-3">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Estimasi durasi pengerjaan: <strong>{estimatedDays} hari</strong> ({Math.ceil(estimatedDays / 7)} minggu) untuk {result.area} m²</span>
                </div>
              )}

              {/* Location note */}
              {result.locationFactor !== 1.0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-800 mb-3">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Harga sudah disesuaikan dengan faktor lokasi <strong>{result.location}</strong> (×{result.locationFactor.toFixed(2)} dari harga dasar nasional)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Breakdown */}
          {materialBreakdown.length > 0 && (
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <button onClick={() => setShowBreakdown((v) => !v)}
                  className="flex items-center justify-between w-full text-left">
                  <span className="font-semibold">Rincian Material ({result.category})</span>
                  {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showBreakdown && (
                  <div className="mt-4 space-y-3">
                    {materialBreakdown.map((m) => {
                      const itemCost = allocateMoneyPercentage(result.materialCost, m.portion);
                      return (
                        <div key={m.item}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{m.item}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{m.portion}%</span>
                              <span className="font-medium">{formatCurrency(itemCost)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${m.portion}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t flex justify-between font-semibold text-sm">
                      <span>Total Material</span>
                      <span>{formatCurrency(result.materialCost)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comparison table */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Perbandingan Kualitas Material</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_CONFIG.map((q) => {
                  const currentPercent = Math.round((qConfig?.multiplier || 1) * 100);
                  const targetPercent = Math.round(q.multiplier * 100);
                  const total = scaleMoney(result.total, targetPercent, currentPercent);
                  const isActive = q.value === result.quality;
                  return (
                    <div key={q.value} className={`p-3 rounded-xl text-center border-2 ${isActive ? "border-primary bg-primary/5" : "border-border"}`}>
                      <p className="text-xs font-semibold mb-1">{q.label}</p>
                      <p className={`text-sm font-bold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{formatCurrency(total)}</p>
                      {isActive && <Badge className="text-xs mt-1 bg-primary/10 text-primary border-none">Dipilih</Badge>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="gap-2" onClick={() => { setResult(null); setForm(f => ({...f, area: "", category: ""})); }}>
              <Calculator className="h-4 w-4" /> Hitung Ulang
            </Button>
            <Button className="gap-2" onClick={() => window.location.href = "/jobs/create"}>
              <TrendingUp className="h-4 w-4" /> Buat Proyek
            </Button>
          </div>

          <div className="p-3 bg-yellow-50 rounded-xl text-xs text-yellow-800 flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Estimasi ini bersifat perkiraan berdasarkan harga pasar rata-rata. Harga aktual dapat bervariasi ±20% tergantung kondisi lapangan, spesifikasi detail, dan fluktuasi harga material.</span>
          </div>
        </div>
      )}
    </div>
  );
}
