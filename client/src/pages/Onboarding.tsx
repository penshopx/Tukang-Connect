import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, HardHat, User, ChevronRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile, useUpdateProfile, useUpdateRole, useCompleteOnboarding } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { SKILLS_LIST, JOB_CATEGORIES, KKNI_LEVELS } from "@/lib/constants";
import { canonicalMoneyInput } from "@/lib/utils";

// Steps: 0=PilihPeran, 1=SelamatDatang, 2=InfoDasar, 3=KeahlianPengalaman, 4=Selesai
const STEPS = ["Pilih Peran", "Selamat Datang", "Info Dasar", "Keahlian & Pengalaman", "Selesai"];

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const { data: profile } = useProfile();
  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: updateRole, isPending: updatingRole } = useUpdateRole();
  const { mutate: completeOnboarding, isPending: completingOnboarding } = useCompleteOnboarding();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>(profile?.role || "pelanggan");
  const [form, setForm] = useState({
    bio: "",
    location: "",
    phone: "",
    category: "",
    hourlyRate: "",
    kkniLevel: "",
    yearsExperience: "",
    isMandor: false,
    skills: [] as string[],
  });

  useEffect(() => {
    if (step === 0 && (profile?.role === "pelanggan" || profile?.role === "tukang")) {
      setSelectedRole(profile.role);
    }
  }, [profile?.role, step]);

  // After role selection, treat selected role as authoritative for the rest of the flow
  const isTukang = selectedRole === "tukang";

  const toggleSkill = (skill: string) => {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  };

  const handleRoleConfirm = () => {
    updateRole(selectedRole, {
      onSuccess: () => {
        setStep(1);
      },
      onError: () => {
        toast({ title: "Gagal menyimpan peran", variant: "destructive" });
      },
    });
  };

  const handleFinish = () => {
    let hourlyRate: string | null;
    try {
      hourlyRate = form.hourlyRate ? canonicalMoneyInput(form.hourlyRate) : null;
    } catch (error) {
      toast({ title: "Tarif tidak valid", description: (error as Error).message, variant: "destructive" });
      return;
    }
    updateProfile(
      {
        ...form,
        hourlyRate,
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      },
      {
        onSuccess: () => {
          completeOnboarding(undefined, {
            onSuccess: () => {
              toast({ title: "Profil Berhasil Dibuat!" });
              navigate("/dashboard");
            },
            onError: () => {
              toast({
                title: "Gagal menyelesaikan onboarding",
                description: "Silakan coba lagi.",
                variant: "destructive",
              });
            },
          });
        },
        onError: () => {
          toast({
            title: "Gagal menyimpan profil",
            description: "Silakan coba lagi.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleSkip = () => {
    completeOnboarding(undefined, {
      onSuccess: () => navigate("/dashboard"),
      onError: () => {
        toast({
          title: "Gagal menyelesaikan onboarding",
          description: "Silakan coba lagi.",
          variant: "destructive",
        });
      },
    });
  };

  // Visible steps depend on role — tukang has 5 steps, pelanggan has 4 (no skills step)
  const visibleStepCount = isTukang ? STEPS.length : STEPS.length - 1;
  const displayStep = step > 3 && !isTukang ? step - 1 : step;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {Array.from({ length: visibleStepCount }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i <= displayStep ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>
                {i < displayStep ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < visibleStepCount - 1 && (
                <div className={`h-0.5 w-8 sm:w-12 transition-all ${i < displayStep ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Step 0 — Role selection */}
            {step === 0 && (
              <div>
                <div className="text-center mb-6">
                  <div className="bg-primary/10 p-5 rounded-2xl w-fit mx-auto mb-4">
                    <HardHat className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Daftar sebagai apa?</h2>
                  <p className="text-muted-foreground text-sm">
                    Pilih peran Anda di KerjaProyek. Anda bisa mengubahnya nanti melalui profil.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    {
                      value: "pelanggan",
                      label: "Pelanggan",
                      desc: "Saya ingin mencari & hire tenaga ahli konstruksi",
                      icon: <User className="h-8 w-8 text-primary" />,
                    },
                    {
                      value: "tukang",
                      label: "Tenaga Ahli",
                      desc: "Saya ingin menawarkan jasa dan menerima proyek",
                      icon: <Wrench className="h-8 w-8 text-primary" />,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedRole(opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col gap-3 ${
                        selectedRole === opt.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="bg-primary/10 p-2 rounded-lg w-fit">{opt.icon}</div>
                      <div>
                        <div className="font-bold text-sm">{opt.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleRoleConfirm}
                  disabled={updatingRole}
                >
                  {updatingRole ? "Menyimpan..." : "Lanjut"}
                  {!updatingRole && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            )}

            {/* Step 1 — Welcome */}
            {step === 1 && (
              <div className="text-center">
                <div className="bg-primary/10 p-5 rounded-2xl w-fit mx-auto mb-5">
                  <HardHat className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Selamat Datang di KerjaProyek!</h2>
                <p className="text-muted-foreground mb-6">
                  {isTukang
                    ? "Lengkapi profil Anda untuk menarik lebih banyak klien dan mendapatkan proyek terbaik."
                    : "Lengkapi profil Anda untuk mulai mencari tenaga ahli konstruksi terbaik."}
                </p>
                <Button size="lg" className="gap-2" onClick={() => setStep(2)}>
                  Mulai Lengkapi Profil <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2 — Basic info */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Informasi Dasar</h2>
                <div>
                  <label className="text-sm font-medium mb-1 block">Bio Singkat</label>
                  <Textarea
                    placeholder="Ceritakan sedikit tentang diri Anda..."
                    value={form.bio}
                    onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Lokasi</label>
                    <Input placeholder="Jakarta Selatan" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Telepon</label>
                    <Input placeholder="0812-xxxx-xxxx" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkip}
                    disabled={completingOnboarding}
                  >
                    {completingOnboarding ? "Menyimpan..." : "Lewati"}
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(isTukang ? 3 : 4)}>Lanjut</Button>
                </div>
              </div>
            )}

            {/* Step 3 — Skills & experience (tukang only) */}
            {step === 3 && isTukang && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Keahlian & Pengalaman</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Tarif/Jam (Rp)</label>
                    <Input inputMode="numeric" placeholder="150000" value={form.hourlyRate} onChange={(e) => setForm(f => ({ ...f, hourlyRate: e.target.value.replace(/\D/g, "") }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Pengalaman (thn)</label>
                    <Input type="number" placeholder="5" value={form.yearsExperience} onChange={(e) => setForm(f => ({ ...f, yearsExperience: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Kategori Utama</label>
                  <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                    <SelectContent>{JOB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Pilih Keahlian</label>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {SKILLS_LIST.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          form.skills.includes(skill) ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Kembali</Button>
                  <Button className="flex-1" onClick={() => setStep(4)}>Lanjut</Button>
                </div>
              </div>
            )}

            {/* Step 4 — Done */}
            {step === 4 && (
              <div className="text-center">
                <div className="bg-green-100 p-5 rounded-2xl w-fit mx-auto mb-5">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Profil Siap!</h2>
                <p className="text-muted-foreground mb-6">
                  {isTukang
                    ? "Profil Anda sudah lengkap. Mulai cari proyek dan kembangkan karir Anda!"
                    : "Profil Anda sudah siap. Mulai temukan tenaga ahli konstruksi terbaik!"}
                </p>
                <Button size="lg" className="gap-2" onClick={handleFinish} disabled={completingOnboarding}>
                  {completingOnboarding ? "Menyimpan..." : "Mulai"}
                  {!completingOnboarding && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
