import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Send, ThumbsUp, Eye, Tag, ChevronDown,
  ChevronUp, Search, Plus, X, HardHat, Zap, BookOpen,
  AlertTriangle, BarChart2, Box, User, Bot, Clock, Star,
  Loader2, RefreshCw, Share2, BookmarkPlus, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const AGENT_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  struktur: { icon: "🏗️", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  arsitektur: { icon: "📐", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  mep: { icon: "⚡", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  k3: { icon: "⛑️", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  manajemen: { icon: "📊", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  material: { icon: "🧱", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
};

const CATEGORY_ICONS: Record<string, string> = {
  Struktur: "🏗️", Arsitektur: "📐", MEP: "⚡", K3: "⛑️",
  Manajemen: "📊", Material: "🧱", Regulasi: "📋", Semua: "🔍",
};

const EXAMPLE_QUESTIONS = [
  "Berapa tebal plat lantai untuk rumah 2 lantai bentang 4m?",
  "Cara menghitung kebutuhan semen untuk plesteran 100m²?",
  "Pondasi apa yang cocok untuk tanah bekas sawah?",
  "Dokumen apa yang diperlukan untuk PBG/IMB baru?",
  "APD wajib apa saja untuk kerja di ketinggian?",
  "Berapa kapasitas AC yang tepat untuk ruang 5×6 meter?",
  "Bagaimana cara menyusun RAB renovasi kamar mandi?",
  "Perbedaan bata merah vs bata ringan (hebel)?",
  "Campuran beton yang benar untuk kolom struktur?",
  "Cara mengatasi dak beton bocor yang efektif?",
];

interface Answer { id: string; body: string; agentId: string; agentName: string; isAI: boolean; upvotes: number; }
interface Question { id: string; title: string; body: string; category: string; tags: string[]; askedBy: string; role: string; answered: boolean; views: number; upvotes: number; answers: Answer[]; }
interface AIAnswer { agentId: string; agentName: string; domain: string; answer: string; confidence: number; references?: string[]; }
interface OrchestratedResult { question: string; primaryAnswer: AIAnswer; supportingAnswers: AIAnswer[]; relatedQuestions: string[]; timestamp: string; }

export default function KlinikaPage() {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAskForm, setShowAskForm] = useState(false);
  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askCategory, setAskCategory] = useState("Struktur");
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<OrchestratedResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [liveQuestion, setLiveQuestion] = useState("");
  const [view, setView] = useState<"forum" | "ask-ai">("forum");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/klinika/questions", { credentials: "include" });
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch { toast({ title: "Gagal memuat pertanyaan", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const askAI = async (q: string) => {
    const question = q || liveQuestion;
    if (!question.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/klinika/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAiResult(data);
      setView("ask-ai");
    } catch { toast({ title: "Gagal mendapat jawaban AI", variant: "destructive" }); }
    finally { setAiLoading(false); }
  };

  const submitQuestion = async () => {
    if (!askTitle.trim() || !askBody.trim()) { toast({ title: "Judul dan pertanyaan wajib diisi", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/klinika/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: askTitle, body: askBody, category: askCategory }),
      });
      const data = await res.json();
      setQuestions(prev => [data.question, ...prev]);
      setShowAskForm(false);
      setAskTitle(""); setAskBody("");
      toast({ title: "Pertanyaan berhasil dikirim!", description: "AI agen sedang menjawab..." });
      setTimeout(() => { setExpandedId(data.question.id); fetchQuestions(); }, 1500);
    } catch { toast({ title: "Gagal mengirim pertanyaan", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const filtered = questions.filter(q => {
    const matchCat = activeCategory === "Semua" || q.category === activeCategory;
    const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const categories = ["Semua", "Struktur", "Arsitektur", "MEP", "K3", "Manajemen", "Material", "Regulasi"];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> Klinika Teknis Konstruksi
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Forum tanya jawab teknis konstruksi — didukung AI spesialis dan komunitas profesional
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 bg-muted rounded-xl w-fit">
        {[{ id: "forum", label: "💬 Forum Komunitas" }, { id: "ask-ai", label: "🤖 Tanya Agen AI" }].map(t => (
          <button key={t.id} onClick={() => setView(t.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === t.id ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── FORUM VIEW ── */}
      {view === "forum" && (
        <>
          {/* Agent Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
            {Object.entries(AGENT_CONFIG).map(([id, conf]) => (
              <div key={id} className={`text-center p-2 rounded-xl border text-xs ${conf.bg} ${conf.color}`}>
                <div className="text-xl mb-1">{conf.icon}</div>
                <p className="font-semibold capitalize leading-tight">{id === "mep" ? "MEP" : id.charAt(0).toUpperCase() + id.slice(1)}</p>
              </div>
            ))}
          </div>

          {/* Quick Ask */}
          <Card className="mb-5 border-primary/30 bg-gradient-to-r from-primary/5 to-blue-50">
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-2">🚀 Tanya Agen AI Sekarang</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Contoh: Berapa tebal pondasi untuk rumah 2 lantai di tanah lembek?"
                  value={liveQuestion}
                  onChange={e => setLiveQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askAI("")}
                  className="bg-white"
                />
                <Button onClick={() => askAI("")} disabled={aiLoading || !liveQuestion.trim()} className="gap-1.5 shrink-0">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Tanya
                </Button>
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {EXAMPLE_QUESTIONS.slice(0, 4).map(q => (
                  <button key={q} onClick={() => { setLiveQuestion(q); askAI(q); }}
                    className="text-xs px-2.5 py-1 bg-white border rounded-full text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                    {q.slice(0, 45)}...
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filter + Post */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari pertanyaan..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setShowAskForm(v => !v)} variant={showAskForm ? "outline" : "default"} className="gap-1.5">
              {showAskForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAskForm ? "Batal" : "Buat Pertanyaan"}
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCategory === cat ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground hover:border-primary/50"}`}>
                {CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>

          {/* Ask Form */}
          {showAskForm && (
            <Card className="mb-5 border-primary/40">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold">Buat Pertanyaan Teknis Baru</h3>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Judul Pertanyaan *</label>
                  <Input placeholder="Ringkasan pertanyaan Anda..." value={askTitle} onChange={e => setAskTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block">Detail Pertanyaan *</label>
                  <Textarea placeholder="Jelaskan detail: dimensi, kondisi, lokasi, spesifikasi yang diketahui..." rows={4} value={askBody} onChange={e => setAskBody(e.target.value)} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Kategori</label>
                    <select value={askCategory} onChange={e => setAskCategory(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-white">
                      {["Struktur", "Arsitektur", "MEP", "K3", "Manajemen", "Material", "Regulasi"].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <Button onClick={submitQuestion} disabled={submitting} className="gap-1.5">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? "Mengirim & Minta Jawaban AI..." : "Kirim Pertanyaan"}
                </Button>
                <p className="text-xs text-muted-foreground">AI Agen akan menjawab pertanyaan Anda secara otomatis dalam beberapa detik</p>
              </CardContent>
            </Card>
          )}

          {/* Questions List */}
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" /><p className="text-muted-foreground">Memuat pertanyaan...</p></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Tidak ada pertanyaan yang sesuai filter</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(q => {
                const isExpanded = expandedId === q.id;
                return (
                  <Card key={q.id} className={`border transition-all hover:shadow-md ${isExpanded ? "border-primary/40" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Vote Column */}
                        <div className="text-center text-xs text-muted-foreground shrink-0 pt-1">
                          <ThumbsUp className="h-4 w-4 mx-auto mb-0.5" />
                          <span className="font-bold">{q.upvotes}</span>
                        </div>
                        {/* Main */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="text-left">
                              <h3 className="font-semibold text-sm hover:text-primary transition-colors leading-snug">{q.title}</h3>
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                              {q.answered && <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">✓ Terjawab</span>}
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" />{q.views}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${AGENT_CONFIG[q.category?.toLowerCase()]?.bg || "bg-muted"} ${AGENT_CONFIG[q.category?.toLowerCase()]?.color || "text-muted-foreground"}`}>
                              {CATEGORY_ICONS[q.category] || "📋"} {q.category}
                            </span>
                            {q.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{t}</span>)}
                            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                              <User className="h-3 w-3" /> {q.askedBy} · {q.role}
                            </span>
                          </div>

                          {/* Answers */}
                          {isExpanded && (
                            <div className="mt-4 space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground">{q.answers.length} Jawaban</p>
                              {q.answers.map(ans => {
                                const conf = AGENT_CONFIG[ans.agentId] || { icon: "🤖", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
                                return (
                                  <div key={ans.id} className={`p-3 rounded-xl border ${conf.bg}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-base">{conf.icon}</span>
                                      <span className={`text-xs font-bold ${conf.color}`}>{ans.agentName}</span>
                                      {ans.isAI && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">AI Agent</Badge>}
                                      <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{ans.upvotes}</span>
                                    </div>
                                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-line prose prose-sm max-w-none">
                                      {ans.body}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <button onClick={() => setExpandedId(isExpanded ? null : q.id)} className="text-xs text-primary flex items-center gap-1 mt-2 hover:underline">
                            {isExpanded ? <><ChevronUp className="h-3 w-3" /> Tutup</> : <><ChevronDown className="h-3 w-3" /> Lihat {q.answers.length} jawaban</>}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── ASK AI VIEW ── */}
      {view === "ask-ai" && (
        <div className="space-y-5">
          {/* Input */}
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Ajukan Pertanyaan Teknis ke Multi-Agen AI
              </p>
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Tuliskan pertanyaan teknis konstruksi Anda secara detail..."
                  rows={3}
                  value={liveQuestion}
                  onChange={e => setLiveQuestion(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button onClick={() => askAI("")} disabled={aiLoading || !liveQuestion.trim()} className="gap-1.5">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {aiLoading ? "Agen sedang menganalisis..." : "Tanya Agen AI"}
                </Button>
                {aiResult && <Button variant="ghost" size="sm" onClick={() => { setAiResult(null); setLiveQuestion(""); }}>Reset</Button>}
              </div>
              {/* Example Questions */}
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Contoh pertanyaan:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {EXAMPLE_QUESTIONS.map(q => (
                    <button key={q} onClick={() => setLiveQuestion(q)}
                      className="text-xs px-2.5 py-1 bg-muted border rounded-full text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                      {q.slice(0, 50)}…
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Loading */}
          {aiLoading && (
            <div className="space-y-3">
              {["Agen Struktur", "Agen MEP", "Agen Material"].map(name => (
                <Card key={name} className="border border-dashed animate-pulse">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* AI Result */}
          {aiResult && !aiLoading && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-xl text-sm">
                <p className="font-semibold">Pertanyaan Anda:</p>
                <p className="text-muted-foreground mt-1">"{aiResult.question}"</p>
              </div>

              {/* Primary Answer */}
              {(() => {
                const primary = aiResult.primaryAnswer;
                const conf = AGENT_CONFIG[primary.agentId] || { icon: "🤖", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
                return (
                  <Card className={`border-2 ${conf.bg}`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{conf.icon}</span>
                        <div>
                          <p className={`font-bold text-sm ${conf.color}`}>{primary.agentName}</p>
                          <p className="text-xs text-muted-foreground">{primary.domain} · Kepercayaan: {(primary.confidence * 100).toFixed(0)}%</p>
                        </div>
                        <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs">Jawaban Utama</Badge>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-line">{primary.answer}</div>
                      {primary.references && primary.references.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-current/10">
                          <p className="text-xs font-semibold mb-1.5 text-muted-foreground">📚 Referensi Standar:</p>
                          <ul className="space-y-1">
                            {primary.references.map(ref => (
                              <li key={ref} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="mt-0.5">•</span><span>{ref}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Supporting Answers */}
              {aiResult.supportingAnswers.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2 text-muted-foreground">Perspektif Agen Lainnya:</p>
                  <div className="space-y-3">
                    {aiResult.supportingAnswers.map(ans => {
                      const conf = AGENT_CONFIG[ans.agentId] || { icon: "🤖", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
                      return (
                        <Card key={ans.agentId} className={`border ${conf.bg}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{conf.icon}</span>
                              <div>
                                <p className={`font-semibold text-xs ${conf.color}`}>{ans.agentName}</p>
                                <p className="text-[10px] text-muted-foreground">{ans.domain}</p>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed">{ans.answer}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Related */}
              {aiResult.relatedQuestions.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold mb-2">💡 Pertanyaan terkait yang mungkin Anda butuhkan:</p>
                    <div className="space-y-1.5">
                      {aiResult.relatedQuestions.map(rq => (
                        <button key={rq} onClick={() => { setLiveQuestion(rq); askAI(rq); }}
                          className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1.5">
                          <span>→</span>{rq}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("forum")}>
                  <MessageSquare className="h-3.5 w-3.5" /> Lihat di Forum
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setAiResult(null); setLiveQuestion(""); }}>
                  <RefreshCw className="h-3.5 w-3.5" /> Tanya Lagi
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
