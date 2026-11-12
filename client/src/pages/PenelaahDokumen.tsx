import { useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  LockKeyhole,
  RotateCcw,
  Shield,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DOCUMENT_FILE_LIMIT,
  DOCUMENT_TEXT_LIMIT,
  reviewDocumentText,
} from "@/lib/documentReview";
import type {
  DocumentReviewCheck,
  DocumentReviewResult,
  ReviewGroup,
} from "@/lib/documentReview";

const formatNumber = (value: number) => new Intl.NumberFormat("id-ID").format(value);

const formatBytes = (bytes: number) =>
  bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1_000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;

function TopicRow({ check, index }: { check: DocumentReviewCheck; index: number }) {
  return (
    <li className="group flex items-start gap-3.5 border-b border-[#e3ebf2] py-4 last:border-0 sm:gap-4">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-xs font-bold tabular-nums ${check.found ? "border-[#b9ddcf] bg-[#eaf6f0] text-[#28724e]" : "border-[#d7e1e9] bg-[#f3f6f9] text-[#718393]"}`}>
        {check.found ? <Check className="h-4 w-4" strokeWidth={2.5} /> : String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold tracking-[-0.015em] text-[#162a3c]">{check.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${check.group === "pokok" ? "bg-[#e4f1fa] text-[#276184]" : "bg-[#eff2f5] text-[#667989]"}`}>
            {check.group === "pokok" ? "Pokok" : "Tambahan"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-[1.65] text-[#65798a]">{check.detail}</p>
      </div>
      <span className={`mt-1 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold ${check.found ? "text-[#28724e]" : "text-[#758595]"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${check.found ? "bg-[#37966a]" : "bg-[#a5b2bd]"}`} />
        {check.found ? "Terdeteksi" : "Tidak terdeteksi"}
      </span>
    </li>
  );
}

function ResultGroup({
  title,
  eyebrow,
  checks,
  group,
}: {
  title: string;
  eyebrow: string;
  checks: DocumentReviewCheck[];
  group: ReviewGroup;
}) {
  const items = checks.filter((check) => check.group === group);
  const found = items.filter((check) => check.found).length;

  return (
    <section aria-label={title} className="rounded-2xl border border-[#d8e4ed] bg-[#fbfdff] px-4 sm:px-5">
      <div className="flex items-end justify-between gap-4 border-b border-[#e3ebf2] py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b8396]">{eyebrow}</p>
          <h3 className="mt-1 text-base font-bold tracking-[-0.03em] text-[#182d40]">{title}</h3>
        </div>
        <span className="font-mono text-xs font-semibold text-[#587287]">{found}<span className="text-[#9aabb8]"> / {items.length}</span></span>
      </div>
      <ul>
        {items.map((check, index) => <TopicRow key={check.id} check={check} index={index} />)}
      </ul>
    </section>
  );
}

export default function PenelaahDokumen() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<DocumentReviewResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const overLimit = text.length > DOCUMENT_TEXT_LIMIT;
  const canReview = text.trim().length > 0 && !overLimit;

  const updateText = (value: string) => {
    setText(value);
    setResult(null);
    setError(value.length > DOCUMENT_TEXT_LIMIT ? `Teks melewati batas ${formatNumber(DOCUMENT_TEXT_LIMIT)} karakter.` : "");
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError("");
    setResult(null);
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError("Pilih file .txt atau .md.");
      return;
    }
    if (file.size > DOCUMENT_FILE_LIMIT) {
      setError(`Ukuran file melebihi batas ${formatBytes(DOCUMENT_FILE_LIMIT)}.`);
      return;
    }
    try {
      const contents = await file.text();
      if (contents.length > DOCUMENT_TEXT_LIMIT) {
        setError(`Isi file melewati batas ${formatNumber(DOCUMENT_TEXT_LIMIT)} karakter. Pilih file yang lebih kecil.`);
        return;
      }
      setText(contents);
      setFileName(file.name);
    } catch {
      setError("File tidak dapat dibaca. Coba pilih file teks lain.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const analyze = () => {
    if (!text.trim()) {
      setError("Tambahkan teks dokumen terlebih dahulu.");
      return;
    }
    if (text.length > DOCUMENT_TEXT_LIMIT) {
      setError(`Teks melewati batas ${formatNumber(DOCUMENT_TEXT_LIMIT)} karakter.`);
      return;
    }
    setError("");
    setResult(reviewDocumentText(text));
  };

  const reset = () => {
    setText("");
    setResult(null);
    setFileName("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-[100dvh] bg-[#eaf2f8] pb-14 text-[#172d40]">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#5d778b]">
          <span>KerjaProyek</span><span className="text-[#a1b1bd]">/</span><span className="text-[#294b63]">Alat proyek</span><span className="text-[#a1b1bd]">/</span><span className="text-[#294b63]">Bedah dokumen</span>
        </div>

        <header className="relative isolate overflow-hidden rounded-[1.7rem] bg-[#101d29] px-5 py-7 text-[#f4f8fb] shadow-[0_20px_50px_-32px_rgba(13,39,58,0.7)] sm:px-9 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 -z-10 h-[26rem] w-[26rem] rounded-full border border-[#42647d]/30" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-[19rem] w-[19rem] rounded-full border border-[#42647d]/35" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-2/3 w-2/3 bg-gradient-to-tl from-[#17506c]/25 to-transparent" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_245px] md:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4a6e83]/60 bg-[#1b3040] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-[#a9dfff]">
                <FileCheck2 className="h-3.5 w-3.5" /> Pemeriksaan topik dokumen
              </div>
              <h1 className="text-[2.15rem] font-bold leading-[1.02] tracking-[-0.055em] sm:text-[3.4rem]">
                Baca poin penting.<br /><span className="text-[#8bd4fa]">Tanpa mengirim dokumen.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#b8c8d4] sm:text-[15px]">
                Lihat apakah beberapa topik operasional proyek disebut dalam teks. Hasilnya membantu Anda meninjau, bukan menggantikan pembacaan dokumen.
              </p>
            </div>
            <div className="rounded-2xl border border-[#345064] bg-[#172a39]/90 p-4">
              <div className="flex items-center gap-2 text-[#a8e1ff]">
                <LockKeyhole className="h-4 w-4" />
                <span className="text-xs font-bold">Privat di perangkat Anda</span>
              </div>
              <p className="mt-2 text-xs leading-[1.65] text-[#b4c3cd]">Teks dianalisis secara lokal di browser. Fitur ini tidak mengunggah atau menyimpan teks.</p>
              <div className="mt-3 flex items-center gap-1.5 border-t border-[#334b5d] pt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8ca5b6]">
                <Shield className="h-3.5 w-3.5" /> Tanpa koneksi layanan eksternal
              </div>
            </div>
          </div>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)]">
          <section className="overflow-hidden rounded-[1.4rem] border border-[#cfdeea] bg-[#f8fbfe] shadow-[0_12px_35px_-30px_rgba(25,64,91,0.5)]" aria-labelledby="input-heading">
            <div className="flex items-start justify-between gap-3 border-b border-[#e1eaf1] px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#deeffa] text-[#27698f]"><FileText className="h-[18px] w-[18px]" /></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6a8294]">01 / Masukkan teks</p>
                  <h2 id="input-heading" className="mt-1 text-lg font-bold tracking-[-0.035em] text-[#162c3f]">Teks proyek</h2>
                </div>
              </div>
              {text.length > 0 && (
                <Button type="button" variant="ghost" onClick={reset} className="h-9 shrink-0 gap-1.5 px-2 text-xs text-[#587184] hover:bg-[#eaf2f7] hover:text-[#1d4058]">
                  <RotateCcw className="h-3.5 w-3.5" /> Bersihkan
                </Button>
              )}
            </div>
            <div className="p-4 sm:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="document-text" className="text-xs font-bold text-[#3a566b]">Tempel isi dokumen di sini</label>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#c7d9e6] bg-white px-3 text-xs font-bold text-[#285b7a] transition-colors hover:border-[#79b6d6] hover:bg-[#f2f9fd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3185b1]">
                  <Upload className="h-3.5 w-3.5" /> Pilih file teks
                </button>
                <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" aria-label="Pilih file teks" onChange={(event) => void handleFile(event.target.files?.[0])} />
              </div>
              <Textarea
                id="document-text"
                value={text}
                onChange={(event) => { updateText(event.target.value); if (fileName) setFileName(""); }}
                placeholder={"Contoh: Ruang lingkup pekerjaan meliputi renovasi area..."}
                rows={11}
                aria-describedby="text-guidance"
                className="min-h-[240px] resize-y rounded-xl border-[#c9d9e4] bg-white px-4 py-3.5 text-[13px] leading-6 text-[#20394c] placeholder:text-[#9aabb7] focus-visible:ring-[#368ab7] focus-visible:ring-offset-1"
              />
              <div id="text-guidance" className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] text-[#708596]">
                <span>{fileName ? `File lokal: ${fileName}` : "Format file: .txt atau .md"} · Maks. file {formatBytes(DOCUMENT_FILE_LIMIT)}</span>
                <span className={overLimit ? "font-bold text-[#b44242]" : ""}>{formatNumber(text.length)} / {formatNumber(DOCUMENT_TEXT_LIMIT)} karakter</span>
              </div>

              {error && (
                <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#edcaca] bg-[#fff5f4] px-3.5 py-3 text-xs leading-5 text-[#9e3f3f]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
                </div>
              )}

              <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xs text-[10px] leading-4 text-[#718696]">Analisis mencocokkan kata dan frasa yang telah ditentukan.</p>
                <Button type="button" onClick={analyze} disabled={!canReview} className="h-11 gap-2 rounded-xl bg-[#142d40] px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#214760] focus-visible:ring-[#51b5e8] disabled:bg-[#aab8c3]">
                  Tinjau topik <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[#cfdeea] bg-[#f8fbfe] p-4 shadow-[0_12px_35px_-30px_rgba(25,64,91,0.5)] sm:p-6" aria-labelledby="results-heading">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8edf2] text-[#526d81]"><CheckCircle2 className="h-[18px] w-[18px]" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6a8294]">02 / Hasil peninjauan</p>
                <h2 id="results-heading" className="mt-1 text-lg font-bold tracking-[-0.035em] text-[#162c3f]">Ringkasan topik</h2>
              </div>
            </div>

            {!result ? (
              <div className="mt-5 flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#c7d8e4] bg-[#f2f7fb] px-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl border border-[#d8e5ed] bg-white text-[#5784a0]"><FileCheck2 className="h-6 w-6" /></div>
                <p className="mt-4 text-sm font-bold text-[#28465d]">Hasil akan tampil di sini</p>
                <p className="mt-1.5 max-w-xs text-xs leading-5 text-[#6f8494]">Tempel teks atau pilih file, lalu tekan “Tinjau topik”.</p>
                <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#648094]"><LockKeyhole className="h-3 w-3" /> Tidak ada teks yang disimpan</span>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-[#142d40] p-4 text-white sm:p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a7bed0]">Topik pokok terdeteksi</p>
                      <p className="mt-1 text-3xl font-bold tracking-[-0.055em] tabular-nums">{result.coreFound}<span className="ml-1.5 text-base font-medium text-[#a9bdcc]">/ {result.coreTotal}</span></p>
                    </div>
                    <div className="text-right text-[10px] leading-5 text-[#b7c8d5]">
                      <p>{result.checks.length - result.needsAttention} dari {result.checks.length} topik terdeteksi</p>
                      <p>{result.needsAttention} belum terdeteksi</p>
                      <p>{formatNumber(result.words)} kata</p>
                      <p>{formatNumber(result.characters)} karakter</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#385165]">
                    <div className="h-full rounded-full bg-[#8bd4fa] transition-[width] duration-500" style={{ width: `${result.coreTotal ? (result.coreFound / result.coreTotal) * 100 : 0}%` }} />
                  </div>
                </div>
                <ResultGroup title="Pokok" eyebrow="Pembahasan inti proyek" checks={result.checks} group="pokok" />
                <ResultGroup title="Tambahan" eyebrow="Topik pendukung" checks={result.checks} group="tambahan" />
                <div role="note" className="flex items-start gap-2.5 rounded-xl border border-[#d6e4ed] bg-[#edf5fa] px-3.5 py-3 text-[11px] leading-[1.6] text-[#526e82]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#427c9d]" />
                  <p><strong className="font-bold text-[#365c74]">Tidak terdeteksi bukan berarti topik tidak ada.</strong> Pemeriksaan ini hanya mencocokkan frasa tertentu; istilah lain atau konteks dokumen mungkin tidak tertangkap.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-5 grid gap-4 rounded-2xl border border-[#cbdce8] bg-[#dcecf6] px-4 py-4 sm:grid-cols-[auto_1fr] sm:items-start sm:px-5" aria-label="Batas penggunaan">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f6fbfe] text-[#39728f]"><Shield className="h-4 w-4" /></div>
          <div>
            <h2 className="text-xs font-bold text-[#24465e]">Alat bantu, bukan penilaian legal</h2>
            <p className="mt-1 text-[11px] leading-[1.65] text-[#526f83]">Bedah dokumen menampilkan daftar topik berdasarkan kata kunci. Fitur ini tidak menilai keabsahan atau kelengkapan dokumen dan bukan nasihat hukum. Baca dokumen secara menyeluruh dan diskusikan hal yang belum jelas dengan pihak terkait.</p>
          </div>
        </section>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-medium uppercase tracking-[0.13em] text-[#7890a0]">
          <span>KerjaProyek / Bedah dokumen</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3 w-3" /> Lokal · Tidak disimpan</span>
        </footer>
      </div>
    </div>
  );
}
