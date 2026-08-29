import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Save, User, Link2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProfile, useUpdateProfile, useUpdateRole } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { SKILLS_LIST, KKNI_LEVELS, JOB_CATEGORIES } from "@/lib/constants";

export default function ProfileEdit() {
  const [, navigate] = useLocation();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutate: updateRole, isPending: isRolePending } = useUpdateRole();
  const { toast } = useToast();
  const [showRoleConfirm, setShowRoleConfirm] = useState(false);

  // Show feedback toasts based on query-string set by the server after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    if (success === "replit_linked") {
      toast({ title: "Akun Replit terhubung!", description: "Anda kini bisa login dengan akun Replit Anda." });
      refetchProfile();
      // Clean the URL without reloading
      window.history.replaceState({}, "", "/profile/edit");
    } else if (error === "replit_already_linked") {
      toast({ title: "Gagal menghubungkan", description: "Akun Replit ini sudah terhubung ke akun lain.", variant: "destructive" });
      window.history.replaceState({}, "", "/profile/edit");
    } else if (error === "link_failed") {
      toast({ title: "Gagal menghubungkan", description: "Terjadi kesalahan saat menghubungkan akun Replit.", variant: "destructive" });
      window.history.replaceState({}, "", "/profile/edit");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [form, setForm] = useState({
    bio: "",
    location: "",
    phone: "",
    hourlyRate: "",
    category: "",
    kkniLevel: "",
    yearsExperience: "",
    isMandor: false,
    skills: [] as string[],
    certifications: [] as string[],
  });
  const [newCert, setNewCert] = useState("");

  useEffect(() => {
    if (profile?.profile) {
      const p = profile.profile;
      setForm({
        bio: p.bio || "",
        location: p.location || "",
        phone: p.phone || "",
        hourlyRate: p.hourlyRate ? String(p.hourlyRate) : "",
        category: p.category || "",
        kkniLevel: p.kkniLevel || "",
        yearsExperience: p.yearsExperience ? String(p.yearsExperience) : "",
        isMandor: p.isMandor || false,
        skills: p.skills || [],
        certifications: p.certifications || [],
      });
    }
  }, [profile]);

  const toggleSkill = (skill: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  };

  const addCert = () => {
    if (newCert.trim() && !form.certifications.includes(newCert.trim())) {
      setForm((f) => ({ ...f, certifications: [...f.certifications, newCert.trim()] }));
      setNewCert("");
    }
  };

  const removeCert = (cert: string) => {
    setForm((f) => ({ ...f, certifications: f.certifications.filter((c) => c !== cert) }));
  };

  const otherRole = profile?.role === "tukang" ? "pelanggan" : "tukang";
  const currentRoleLabel = profile?.role === "tukang" ? "Tukang (Penyedia Jasa)" : "Pelanggan (Pencari Jasa)";
  const otherRoleLabel = otherRole === "tukang" ? "Tukang (Penyedia Jasa)" : "Pelanggan (Pencari Jasa)";

  const handleRoleSwitch = () => {
    updateRole(otherRole, {
      onSuccess: (result: { withdrawnApplications?: number }) => {
        setShowRoleConfirm(false);
        toast({
          title: "Peran Diperbarui!",
          description: result?.withdrawnApplications
            ? `Akun Anda sekarang terdaftar sebagai ${otherRoleLabel}. ${result.withdrawnApplications} lamaran yang masih menunggu telah ditarik otomatis.`
            : `Akun Anda sekarang terdaftar sebagai ${otherRoleLabel}.`,
        });
      },
      onError: (err) => {
        toast({ title: "Gagal", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(
      {
        ...form,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : null,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      },
      {
        onSuccess: () => toast({ title: "Profil Diperbarui!" }),
        onError: (err) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
      }
    );
  };

  const isTukang = profile?.role === "tukang";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Profil</h1>
        <p className="text-muted-foreground text-sm">Perbarui informasi profil Anda</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Informasi Dasar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Bio Singkat</label>
              <Textarea
                placeholder="Ceritakan sedikit tentang diri Anda..."
                value={form.bio}
                onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Lokasi</label>
                <Input placeholder="Contoh: Jakarta Selatan" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nomor Telepon</label>
                <Input placeholder="0812-3456-7890" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isTukang && (
          <>
            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">Informasi Profesional</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tarif per Jam (Rp)</label>
                    <Input type="number" placeholder="150000" value={form.hourlyRate} onChange={(e) => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Pengalaman (Tahun)</label>
                    <Input type="number" placeholder="5" value={form.yearsExperience} onChange={(e) => setForm(f => ({ ...f, yearsExperience: e.target.value }))} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Kategori Utama</label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>
                      {JOB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Level KKNI</label>
                  <Select value={form.kkniLevel} onValueChange={(v) => setForm(f => ({ ...f, kkniLevel: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih level KKNI" /></SelectTrigger>
                    <SelectContent>
                      {KKNI_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="mandor"
                    checked={form.isMandor}
                    onChange={(e) => setForm(f => ({ ...f, isMandor: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="mandor" className="text-sm">Centang jika Anda memimpin tim pekerja konstruksi</label>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">Keahlian</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {SKILLS_LIST.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        form.skills.includes(skill)
                          ? "bg-primary text-white border-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-base">Sertifikasi</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Contoh: BNSP Level 4"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())}
                  />
                  <Button type="button" onClick={addCert} variant="outline">Tambah</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.certifications.map((cert) => (
                    <Badge key={cert} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeCert(cert)}>
                      {cert} ×
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Change Role ──────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Peran Akun</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Peran saat ini</p>
                <p className="text-sm text-muted-foreground mt-0.5">{currentRoleLabel}</p>
              </div>
              {!showRoleConfirm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => setShowRoleConfirm(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Ganti Peran
                </Button>
              )}
            </div>

            {showRoleConfirm && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                    <p className="font-medium">Konfirmasi pergantian peran</p>
                    <p>
                      Anda akan beralih ke <span className="font-semibold">{otherRoleLabel}</span>.
                      Fitur yang tersedia akan berubah:
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
                      {otherRole === "tukang" ? (
                        <>
                          <li>Anda bisa melamar pekerjaan yang diposting pelanggan</li>
                          <li>Anda tidak bisa lagi memposting lowongan pekerjaan</li>
                        </>
                      ) : (
                        <>
                          <li>Anda bisa memposting lowongan pekerjaan</li>
                          <li>Anda tidak bisa lagi melamar pekerjaan sebagai tukang</li>
                          <li>Lamaran yang masih menunggu akan ditarik otomatis</li>
                          <li>Kontrak aktif dan proyek yang pernah Anda posting tetap tersedia</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRoleConfirm(false)}
                    disabled={isRolePending}
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRoleSwitch}
                    disabled={isRolePending}
                  >
                    {isRolePending ? "Memperbarui..." : `Ya, ganti ke ${otherRoleLabel}`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Connected accounts ───────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Akun Terhubung</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-3">
                {/* Replit "R" logo mark */}
                <div className="h-9 w-9 rounded-lg bg-[#F26207] flex items-center justify-center text-white font-bold text-sm select-none">
                  R
                </div>
                <div>
                  <p className="text-sm font-medium">Replit</p>
                  {profile?.replitId ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Terhubung
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-yellow-500" />
                      Belum terhubung
                    </p>
                  )}
                </div>
              </div>
              {!profile?.replitId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => { window.location.href = "/api/auth/replit/link"; }}
                >
                  <Link2 className="h-4 w-4" />
                  Hubungkan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full gap-2" disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </form>
    </div>
  );
}
