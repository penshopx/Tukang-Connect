import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Bot, X, MessageCircle, Zap } from "lucide-react";

const HIDE_ON = ["/chatbot", "/login", "/register", "/onboarding"];

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Popup card */}
      {open && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-72 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">AI Assistant</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-blue-100 text-xs">Online · 6 Agen Aktif</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick questions */}
          <div className="p-4 space-y-2">
            <p className="text-xs text-slate-500 font-medium mb-3">Pertanyaan populer:</p>
            {[
              "Berapa biaya renovasi kamar mandi?",
              "APD wajib kerja di ketinggian?",
              "Cara hitung RAB pondasi?",
            ].map((q) => (
              <Link
                key={q}
                href={`/chatbot?q=${encodeURIComponent(q)}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2 text-xs text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg px-2 py-2 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                {q}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="px-4 pb-4">
            <Link href="/chatbot" onClick={() => setOpen(false)}>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Buka AI Assistant
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => { setOpen((o) => !o); setPulse(false); }}
        className={`
          relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
          ${open
            ? "bg-slate-700 hover:bg-slate-800 rotate-0 scale-95"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-110"}
        `}
        aria-label="Buka AI Chatbot"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}

        {/* Pulse ring */}
        {pulse && !open && (
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-40" />
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
