import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Bot,
  X,
  MessageCircle,
  Zap,
  Calculator,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  BookOpen,
  Search,
} from "lucide-react";

const HIDE_ON = ["/chatbot", "/login", "/register", "/onboarding"];

const QUICK_QUESTIONS = [
  "Bagaimana cara posting proyek dan mencari tenaga ahli?",
  "Bantu saya menyusun estimasi biaya dan milestone proyek",
  "Apa yang perlu dicek sebelum menandatangani kontrak?",
];

const FEATURE_SHORTCUTS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Estimator RAB", href: "/cost-estimator", icon: Calculator },
  { label: "Kontrak", href: "/contracts", icon: FileCheck2 },
  { label: "Cari Ahli", href: "/experts", icon: Search },
  { label: "Materi Belajar", href: "/study-materials", icon: BookOpen },
  { label: "Cari Proyek", href: "/jobs", icon: ClipboardList },
];

export default function FloatingChatbot() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  // Stop pulsing after first interaction
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000);
    return () => clearTimeout(t);
  }, []);

  if (HIDE_ON.includes(location)) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup card */}
      {open && (
        <div
          id="floating-chatbot-panel"
          role="dialog"
          aria-label="Akses cepat AI Assistant"
          className="bg-card text-card-foreground rounded-2xl shadow-2xl border border-border w-80 max-w-[calc(100vw-2rem)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">AI Assistant KerjaProyek</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-blue-100 text-xs">Panduan proyek & konstruksi</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Tutup AI Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick questions */}
          <div className="p-4 pb-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-3">Mulai dari kebutuhan Anda:</p>
            {QUICK_QUESTIONS.map((q) => (
              <Link
                key={q}
                href={`/chatbot?q=${encodeURIComponent(q)}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2 text-xs text-foreground/80 hover:text-primary hover:bg-primary/10 rounded-lg px-2 py-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                {q}
              </Link>
            ))}
          </div>

          {/* Feature shortcuts */}
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium mb-2">Akses fitur KerjaProyek:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FEATURE_SHORTCUTS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 pb-4">
            <Link
              href="/chatbot"
              onClick={() => setOpen(false)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Buka AI Assistant
            </Link>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => { setOpen((o) => !o); setPulse(false); }}
        className={`
          relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
          ${open
            ? "bg-slate-700 hover:bg-slate-800 rotate-0 scale-95"
            : "bg-primary hover:bg-primary/90 hover:scale-110"}
        `}
        aria-label="Buka AI Chatbot"
        aria-expanded={open}
        aria-controls="floating-chatbot-panel"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}

        {/* Pulse ring */}
        {pulse && !open && (
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
        )}

        {/* Badge */}
        {!open && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow">
            AI
          </span>
        )}
      </button>
    </div>
  );
}
