import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { HardHat, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogin, useRegister } from "@/hooks/useUser";
import { useToast } from "@/hooks/use-toast";
import { ApiRequestError } from "@/lib/queryClient";

const SERVICE_UNAVAILABLE_MESSAGE = "Layanan sedang tidak tersedia. Silakan tunggu sebentar dan coba lagi.";
const MIN_PASSWORD_LENGTH = 8;

type AuthError = {
  title: string;
  description: string;
};

function getAuthError(error: unknown, action: "masuk" | "daftar"): AuthError {
  const requestError = error instanceof ApiRequestError ? error : null;
  const errorMessage = error instanceof Error ? error.message : "";
  const isServiceUnavailable =
    requestError?.status === 503 ||
    requestError?.code === "DB_UNAVAILABLE" ||
    /layanan sedang tidak tersedia|database.*tidak dapat dijangkau/i.test(errorMessage);

  if (isServiceUnavailable) {
    return {
      title: "Layanan Tidak Tersedia",
      description: SERVICE_UNAVAILABLE_MESSAGE,
    };
  }

  return {
    title: action === "masuk" ? "Gagal masuk" : "Gagal daftar",
    description: errorMessage || "Terjadi kesalahan. Silakan coba lagi.",
  };
}

// Replit SVG logo mark
function ReplitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 4A1.5 1.5 0 0 1 5 2.5h6A1.5 1.5 0 0 1 12.5 4v5A1.5 1.5 0 0 1 11 10.5H5A1.5 1.5 0 0 1 3.5 9V4ZM11.5 10A1.5 1.5 0 0 1 13 8.5h6A1.5 1.5 0 0 1 20.5 10v4A1.5 1.5 0 0 1 19 15.5h-6A1.5 1.5 0 0 1 11.5 14v-4ZM3.5 15A1.5 1.5 0 0 1 5 13.5h6A1.5 1.5 0 0 1 12.5 15v5A1.5 1.5 0 0 1 11 21.5H5A1.5 1.5 0 0 1 3.5 20v-5Z"/>
    </svg>
  );
}

export default function AuthPage({ mode = "login" }: { mode?: "login" | "register" }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "pelanggan",
  });

  // Show OAuth callback errors after render so the toast store is not updated
  // while React is rendering this page.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam === "auth_failed") {
      const error = {
        title: "Login Gagal",
        description: "Autentikasi Replit gagal. Silakan coba lagi.",
      };
      setAuthError(error);
      toast({ ...error, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (errorParam === "db_unavailable") {
      const error = {
        title: "Layanan Tidak Tersedia",
        description: "Database sedang tidak dapat dijangkau. Silakan tunggu sebentar dan coba lagi.",
      };
      setAuthError(error);
      toast({ ...error, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  const { mutate: login, isPending: loggingIn } = useLogin();
  const { mutate: register, isPending: registering } = useRegister();

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const passwordHasMinimumLength = form.password.length >= MIN_PASSWORD_LENGTH;
  const passwordIsNotBlank = form.password.trim().length > 0;
  const passwordIsValid = passwordHasMinimumLength && passwordIsNotBlank;
  const passwordHint =
    form.password.length === 0
      ? `Minimal ${MIN_PASSWORD_LENGTH} karakter.`
      : !passwordIsNotBlank
        ? "Password tidak boleh hanya berisi spasi."
        : !passwordHasMinimumLength
          ? `Masih kurang ${MIN_PASSWORD_LENGTH - form.password.length} karakter (minimal ${MIN_PASSWORD_LENGTH} karakter).`
          : "Password memenuhi syarat minimum.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (mode === "login") {
      login(
        { email: form.email, password: form.password },
        {
          onSuccess: (user) => {
            toast({ title: "Berhasil masuk!" });
            navigate(user?.onboardingCompleted === false ? "/onboarding" : "/dashboard");
          },
          onError: (err) => {
            const error = getAuthError(err, "masuk");
            setAuthError(error);
            toast({ ...error, variant: "destructive" });
          },
        }
      );
    } else {
      if (!passwordIsValid) {
        const error = {
          title: "Password belum memenuhi syarat",
          description: passwordHint,
        };
        setAuthError(error);
        return;
      }
      register(form as any, {
        onSuccess: () => {
          toast({ title: "Akun berhasil dibuat!" });
          navigate("/onboarding");
        },
        onError: (err) => {
          const error = getAuthError(err, "daftar");
          setAuthError(error);
          toast({ ...error, variant: "destructive" });
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-indigo-950 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="bg-gradient-to-br from-white via-slate-100 to-sky-100 p-3 rounded-3xl shadow-lg">
              <HardHat className="h-16 w-16 text-orange-500" strokeWidth={2.25} />
            </div>
            <span className="bg-gradient-to-r from-sky-200 via-cyan-300 to-violet-300 bg-clip-text text-transparent font-extrabold text-5xl tracking-[0.04em] leading-[0.82] text-left">
              <span className="block">KERJA</span>
              <span className="block">PROYEK</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">Marketplace Kerja Konstruksi — Harian & Borongan</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {mode === "login" ? "Masuk ke Akun Anda" : "Buat Akun Baru"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authError && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <p className="font-semibold">{authError.title}</p>
                <p>{authError.description}</p>
              </div>
            )}

            {/* Replit OAuth login */}
            <div className="mb-4">
              <a href="/api/auth/replit" className="block w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 font-semibold"
                  onClick={() => { window.location.href = "/api/auth/replit"; }}
                >
                  <ReplitIcon className="h-4 w-4" />
                  {mode === "login" ? "Masuk dengan Replit" : "Daftar dengan Replit"}
                </Button>
              </a>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">atau</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Nama Lengkap</label>
                    <Input
                      name="name"
                      autoComplete="name"
                      placeholder="John Doe"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Username</label>
                    <Input
                      name="username"
                      autoComplete="username"
                      placeholder="username123"
                      value={form.username}
                      onChange={(e) => update("username", e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Password</label>
                <div className="relative">
                  <Input
                    name="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    minLength={mode === "register" ? MIN_PASSWORD_LENGTH : undefined}
                    aria-describedby={mode === "register" ? "register-password-hint" : undefined}
                    aria-invalid={mode === "register" && form.password.length > 0 && !passwordIsValid}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "register" && (
                  <p
                    id="register-password-hint"
                    aria-live="polite"
                    className={`mt-1 text-xs ${passwordIsValid ? "text-emerald-600" : "text-muted-foreground"}`}
                  >
                    {passwordHint}
                  </p>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Daftar sebagai</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "pelanggan", label: "Pelanggan", desc: "Cari & Hire Tukang" },
                      { value: "tukang", label: "Tenaga Ahli", desc: "Terima Proyek" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => update("role", opt.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          form.role === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-semibold text-sm">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loggingIn || registering}>
                {loggingIn || registering ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar Sekarang"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Belum punya akun?{" "}
                  <button onClick={() => navigate("/register")} className="text-primary font-semibold hover:underline">
                    Daftar
                  </button>
                </>
              ) : (
                <>
                  Sudah punya akun?{" "}
                  <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline">
                    Masuk
                  </button>
                </>
              )}
            </div>

            {mode === "login" && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Demo Akun:</p>
                <p>Pelanggan: budi@example.com / password123</p>
                <p>Tukang: ahmad@example.com / password123</p>
                <p>Admin: admin@kerjaproyek.id / admin123</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
