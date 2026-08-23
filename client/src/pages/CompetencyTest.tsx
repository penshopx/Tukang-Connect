import { useState } from "react";
import { Award, ChevronRight, CheckCircle, XCircle, Clock, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KKNI_LEVELS } from "@/lib/constants";

const SAMPLE_QUESTIONS = [
  {
    id: 1,
    question: "Apa kepanjangan dari SKKNI dalam konteks konstruksi?",
    options: [
      "Standar Kompetensi Kerja Nasional Indonesia",
      "Sertifikat Keahlian Konstruksi Nasional Indonesia",
      "Standar Kualitas Kerja Nasional Indonesia",
      "Sistem Kompetensi Konstruksi Nasional Indonesia",
    ],
    correct: 0,
    explanation: "SKKNI adalah Standar Kompetensi Kerja Nasional Indonesia yang menjadi acuan uji kompetensi di Indonesia.",
  },
  {
    id: 2,
    question: "Berapakah mutu beton minimum untuk konstruksi bangunan gedung 2 lantai?",
    options: ["K-175", "K-225", "K-250", "K-300"],
    correct: 1,
    explanation: "Untuk bangunan gedung 2 lantai, mutu beton minimum adalah K-225 atau setara f'c 18,7 MPa.",
  },
  {
    id: 3,
    question: "Dalam keselamatan kerja konstruksi, APD wajib yang harus digunakan saat pekerjaan ketinggian adalah?",
    options: [
      "Helm dan sepatu safety",
      "Helm, sepatu, dan rompi",
      "Helm, harness, dan sepatu safety",
      "Sarung tangan dan kacamata",
    ],
    correct: 2,
    explanation: "Pekerjaan di ketinggian wajib menggunakan helm, full body harness, dan sepatu safety untuk mencegah jatuh.",
  },
  {
    id: 4,
    question: "Apa fungsi bekisting (formwork) dalam pekerjaan beton?",
    options: [
      "Sebagai penopang struktur permanen",
      "Sebagai cetakan untuk beton segar hingga mengeras",
      "Sebagai lapisan pelindung beton",
      "Sebagai media tulangan beton",
    ],
    correct: 1,
    explanation: "Bekisting berfungsi sebagai cetakan sementara yang menahan beton segar selama proses pengecoran hingga beton mencapai kekuatan awal.",
  },
  {
    id: 5,
    question: "Standar kemiringan atap minimum untuk penutup genteng adalah?",
    options: ["15°", "22,5°", "25°", "30°"],
    correct: 2,
    explanation: "Kemiringan minimum untuk penutup atap genteng adalah 25° atau sekitar 47% untuk menjamin aliran air hujan yang baik.",
  },
];

type Phase = "setup" | "test" | "result";

export default function CompetencyTestPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [form, setForm] = useState({ category: "", level: "", questionCount: "30" });
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  const questions = SAMPLE_QUESTIONS;
  const totalQ = Math.min(questions.length, Number(form.questionCount));
  const displayQuestions = questions.slice(0, totalQ);

  const currentQuestion = displayQuestions[currentQ];
  const selectedAnswer = answers[currentQ];
  const isCorrect = selectedAnswer === currentQuestion?.correct;

  const score = Object.entries(answers).filter(([idx, ans]) => displayQuestions[Number(idx)]?.correct === ans).length;
  const percentage = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;

  const selectAnswer = (idx: number) => {
    if (selectedAnswer !== undefined) return;
    setAnswers((a) => ({ ...a, [currentQ]: idx }));
    setShowExplanation(true);
  };

  const next = () => {
    if (currentQ < displayQuestions.length - 1) {
      setCurrentQ((q) => q + 1);
      setShowExplanation(false);
    } else {
      setPhase("result");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {phase === "setup" && (
        <>
          <div className="text-center mb-8">
            <div className="bg-primary/10 p-4 rounded-2xl w-fit mx-auto mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Uji Kompetensi Konstruksi</h1>
            <p className="text-muted-foreground text-sm">Berdasarkan SKKNI - Latihan soal uji kompetensi BNSP</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { count: "30", duration: "45 menit", label: "Uji Dasar" },
              { count: "40", duration: "60 menit", label: "Uji Madya" },
              { count: "50", duration: "75 menit", label: "Uji Ahli" },
            ].map((opt) => (
              <button
                key={opt.count}
                onClick={() => setForm(f => ({ ...f, questionCount: opt.count }))}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  form.questionCount === opt.count ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl font-bold text-primary">{opt.count}</div>
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Clock className="h-3 w-3" /> {opt.duration}
                </div>
              </button>
            ))}
          </div>

          <Card className="shadow-sm mb-6">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Level KKNI</label>
                <Select value={form.level} onValueChange={(v) => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih level KKNI" /></SelectTrigger>
                  <SelectContent>{KKNI_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Button className="w-full gap-2" size="lg" onClick={() => setPhase("test")}>
            Mulai Uji Kompetensi <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {phase === "test" && currentQuestion && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">
              Soal {currentQ + 1} dari {displayQuestions.length}
            </span>
            <Badge variant="outline">{percentage}% Benar</Badge>
          </div>
          <Progress value={((currentQ + 1) / displayQuestions.length) * 100} className="mb-6" />

          <Card className="shadow-sm mb-4">
            <CardContent className="p-6">
              <p className="font-semibold text-base mb-6">{currentQuestion.question}</p>
              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  let cls = "border-border hover:border-primary/50 hover:bg-muted/50";
                  if (selectedAnswer !== undefined) {
                    if (idx === currentQuestion.correct) cls = "border-green-500 bg-green-50";
                    else if (idx === selectedAnswer) cls = "border-red-400 bg-red-50";
                    else cls = "border-border opacity-60";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => selectAnswer(idx)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cls}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm">{opt}</span>
                        {selectedAnswer !== undefined && idx === currentQuestion.correct && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto flex-shrink-0" />
                        )}
                        {selectedAnswer === idx && idx !== currentQuestion.correct && (
                          <XCircle className="h-4 w-4 text-red-500 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {showExplanation && (
                <div className={`mt-4 p-3 rounded-xl text-sm ${isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  <strong>{isCorrect ? "✓ Benar!" : "✗ Salah."}</strong> {currentQuestion.explanation}
                </div>
              )}
            </CardContent>
          </Card>

          <Button className="w-full" onClick={next} disabled={selectedAnswer === undefined}>
            {currentQ === displayQuestions.length - 1 ? "Lihat Hasil" : "Lanjut"} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {phase === "result" && (
        <div className="text-center">
          <div className={`p-5 rounded-2xl w-fit mx-auto mb-6 ${percentage >= 70 ? "bg-green-100" : "bg-orange-100"}`}>
            <Award className={`h-12 w-12 ${percentage >= 70 ? "text-green-600" : "text-orange-500"}`} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Hasil Uji Kompetensi</h2>
          <div className="text-5xl font-bold text-primary my-4">{percentage}%</div>
          <p className="text-muted-foreground mb-2">
            {score} dari {displayQuestions.length} soal dijawab benar
          </p>
          <Badge className={`text-sm mb-6 ${percentage >= 70 ? "bg-green-500" : "bg-orange-500"}`}>
            {percentage >= 70 ? "Kompeten" : "Belum Kompeten"}
          </Badge>
          <div className="p-4 bg-muted rounded-xl text-sm text-muted-foreground mb-6">
            {percentage >= 70
              ? "Selamat! Anda lulus uji kompetensi ini. Siapkan diri untuk uji kompetensi resmi BNSP."
              : "Tingkatkan pemahaman Anda dan coba lagi. Pelajari materi yang belum dikuasai."}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setPhase("setup"); setAnswers({}); setCurrentQ(0); }}>
              Coba Lagi
            </Button>
            <Button className="flex-1" onClick={() => {}}>
              Ambil Uji Kompetensi Lainnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
