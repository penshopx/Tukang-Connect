import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileText,
  HardHat,
  Layers3,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";

type ChecklistGroup = "ahli" | "usaha";

type ChecklistItem = {
  id: string;
  group: ChecklistGroup;
  title: string;
  detail: string;
};

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: "identitas", group: "ahli", title: "Identitas dan data kontak", detail: "Pastikan informasi pribadi dan kontak yang digunakan masih aktif." },
  { id: "pengalaman", group: "ahli", title: "Riwayat pengalaman kerja", detail: "Susun peran, ruang lingkup pekerjaan, dan periode proyek secara ringkas." },
  { id: "portofolio", group: "ahli", title: "Bukti hasil pekerjaan", detail: "Pilih dokumentasi yang relevan dan pastikan Anda berhak membagikannya." },
  { id: "kompetensi", group: "ahli", title: "Catatan kompetensi dan pelatihan", detail: "Simpan informasi pelatihan atau kompetensi yang sesuai dengan pekerjaan." },
  { id: "keselamatan", group: "ahli", title: "Kesiapan keselamatan kerja", detail: "Tinjau praktik keselamatan, alat pelindung, dan prosedur lapangan." },
  { id: "legalitas", group: "usaha", title: "Data dan identitas badan usaha", detail: "Rapikan informasi badan usaha yang relevan untuk lingkup proyek." },
  { id: "ruang-lingkup", group: "usaha", title: "Ruang lingkup dan kapasitas pekerjaan", detail: "Petakan jenis pekerjaan, kapasitas tim, dan wilayah layanan." },
  { id: "administrasi", group: "usaha", title: "Dokumen administrasi proyek", detail: "Kelompokkan dokumen yang mungkin diminta untuk proses proyek." },
  { id: "rencana-biaya", group: "usaha", title: "Rencana biaya dan jadwal", detail: "Siapkan perkiraan biaya, tahapan kerja, dan asumsi yang digunakan." },
  { id: "kontrak", group: "usaha", title: "Pemeriksaan ruang lingkup kesepakatan", detail: "Catat pekerjaan, tanggung jawab, jadwal, dan hal yang perlu diklarifikasi." },
];

const GROUPS: { id: ChecklistGroup; title: string; intro: string; icon: typeof HardHat }[] = [
  { id: "ahli", title: "Tenaga ahli", intro: "Bekal pengalaman dan kesiapan kerja personal.", icon: HardHat },
  { id: "usaha", title: "Badan usaha / proyek", intro: "Catatan administrasi dan perencanaan pekerjaan.", icon: Building2 },
];

const DESTINATIONS = [
  { title: "Temukan proyek", description: "Lihat pekerjaan yang sedang dibuka.", href: "/jobs", icon: BriefcaseBusiness, category: "Kerja", number: "01", tone: "sky" },
  { title: "Portofolio", description: "Tampilkan pengalaman dan hasil kerja.", href: "/portfolio", icon: Layers3, category: "Kerja", number: "02", tone: "blue" },
  { title: "Materi belajar", description: "Perkuat pengetahuan konstruksi.", href: "/study-materials", icon: Lightbulb, category: "Belajar", number: "03", tone: "cyan" },
  { title: "Simulasi kompetensi", description: "Latihan soal untuk mengukur kesiapan.", href: "/competency-test", icon: BadgeCheck, category: "Belajar", number: "04", tone: "sky" },
  { title: "Konsultasi teknis", description: "Diskusikan pertanyaan teknis konstruksi.", href: "/klinika", icon: CircleHelp, category: "Belajar", number: "05", tone: "blue" },
  { title: "Estimator biaya", description: "Susun perkiraan biaya pekerjaan.", href: "/cost-estimator", icon: Calculator, category: "Administrasi", number: "06", tone: "cyan" },
  { title: "Kontrak", description: "Pantau kesepakatan proyek Anda.", href: "/contracts", icon: FileText, category: "Administrasi", number: "07", tone: "sky" },
  { title: "Edit profil", description: "Perbarui informasi profesional.", href: "/profile/edit", icon: UserRound, category: "Administrasi", number: "08", tone: "blue" },
];

function readChecklist(storageKey: string): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([id, value]) =>
        CHECKLIST_ITEMS.some((item) => item.id === id) && typeof value === "boolean",
      ),
    );
  } catch {
    return {};
  }
}

export default function RuangKerja() {
  const { data: user, isLoading, isError, refetch } = useUser();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<ChecklistGroup>("ahli");
  const [openChecklist, setOpenChecklist] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const userId = user?.id;
  const storageKey = userId ? `kerjaproyek:ruang-kerja:checklist:v1:user-${userId}` : null;

  useEffect(() => {
    if (!storageKey) {
      setChecks({});
      setStorageReady(false);
      return;
    }
    setChecks(readChecklist(storageKey));
    setStorageReady(true);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(readChecklist(storageKey)));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !storageReady) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(checks));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [checks, storageKey, storageReady]);

  const completedCount = CHECKLIST_ITEMS.filter((item) => checks[item.id]).length;
  const percentage = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);
  const matchingDestinations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id");
    return DESTINATIONS.filter((item) =>
      !term || `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase("id").includes(term),
    );
  }, [search]);

  const toggleCheck = (id: string) => setChecks((current) => ({ ...current, [id]: !current[id] }));
  const clearChecks = () => setChecks({});

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-[#eaf3fb] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-56 rounded-3xl bg-[#10283b]" />
          <div className="h-12 max-w-sm rounded-xl bg-[#d7e7f3]" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-white/80" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#eaf3fb] px-4 py-12">
        <section className="max-w-md rounded-3xl border border-[#c8dbea] bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-4 h-9 w-9 text-[#1478ad]" />
          <h1 className="text-xl font-bold text-[#10283b]">Ruang kerja belum siap</h1>
          <p className="mt-2 text-sm leading-6 text-[#526b7d]">Identitas akun belum dapat dimuat. Coba lagi untuk membuka ruang kerja Anda.</p>
          <Button className="mt-5 bg-[#1478ad] text-white hover:bg-[#10658f]" onClick={() => refetch()}>Coba lagi</Button>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#eaf3fb] pb-14 text-[#142d40]">
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#10283b] text-[#8bd8ff]">
              <Wrench className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.19em] text-[#507084]">KerjaProyek</p>
              <p className="text-xs font-medium text-[#7890a0]">Ruang Kerja / Ringkasan</p>
            </div>
          </div>
          <Link
            href="/profile/edit"
            className="inline-flex items-center gap-2 rounded-full border border-[#c7dbe9] bg-white/80 px-3 py-2 text-xs font-semibold text-[#29485d] transition-colors hover:border-[#76bce0] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137eaf]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#d9effb] text-[#126b9c]"><UserRound className="h-3.5 w-3.5" /></span>
            <span className="max-w-[130px] truncate">Profil saya</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-[#10283b] px-6 py-8 text-white shadow-[0_18px_45px_-26px_rgba(15,52,77,0.65)] sm:px-9 sm:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 -z-10 h-72 w-72 rounded-full border border-[#3c7598]/35" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-11 -z-10 h-52 w-52 rounded-full border border-[#3c7598]/40" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-1/2 w-1/2 bg-gradient-to-tl from-[#12688f]/35 to-transparent" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#5ba7cc]/35 bg-[#1b4158] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#a9e4ff]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8ddcff]" />
                Pusat kerja konstruksi
              </div>
              <h1 className="max-w-xl text-3xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Semua pekerjaan,<br className="hidden sm:block" /> dalam satu <span className="text-[#8bd8ff]">ruang kerja.</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-[#c0d3df] sm:text-base">
                Cari proyek, kembangkan keahlian, dan rapikan administrasi tanpa berpindah dari KerjaProyek.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/jobs" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#9be2ff] px-4 text-sm font-bold text-[#10283b] shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  Jelajahi proyek <ArrowDownRight className="h-4 w-4" />
                </Link>
                <button type="button" onClick={() => { setOpenChecklist(true); document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#58758a] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9be2ff]">
                  <ListChecks className="h-4 w-4" /> Buka daftar persiapan
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-[#426077] bg-[#18364b]/90 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a9c0cf]">Persiapan pribadi</span>
                  <ClipboardCheck className="h-4 w-4 text-[#8bd8ff]" />
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight">{completedCount}<span className="ml-1 text-base font-medium text-[#91aab9]">/ {CHECKLIST_ITEMS.length}</span></p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#345166]">
                  <div className="h-full rounded-full bg-[#8bd8ff] transition-[width] duration-300" style={{ width: `${percentage}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#426077] bg-[#18364b]/90 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#24506a] text-[#a9e4ff]"><Sparkles className="h-5 w-5" /></div>
                <div><p className="text-xs font-semibold text-[#a9c0cf]">Ruang yang terhubung</p><p className="mt-1 text-sm font-bold text-white">Kerja · Belajar · Kelola</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-9" aria-labelledby="destinations-heading">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3184aa]">Meja kerja</p>
              <h2 id="destinations-heading" className="mt-1 text-2xl font-bold tracking-[-0.03em] text-[#142d40]">Mulai dari yang dibutuhkan</h2>
              <p className="mt-1 text-sm text-[#5e788a]">Akses cepat ke alat kerja yang sudah tersedia di KerjaProyek.</p>
            </div>
            <label className="relative block w-full sm:max-w-[270px]">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#688396]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari alat kerja..." aria-label="Cari alat kerja" className="h-10 rounded-xl border-[#c5d9e7] bg-white pl-9 text-sm placeholder:text-[#8296a4] focus-visible:ring-[#2186b4]" />
            </label>
          </div>

          {matchingDestinations.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {matchingDestinations.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="group relative flex min-h-[158px] flex-col overflow-hidden rounded-2xl border border-[#c9dce9] bg-[#f9fcff] p-4 shadow-[0_5px_18px_-16px_rgba(24,66,91,0.45)] transition-all hover:-translate-y-1 hover:border-[#78b9da] hover:bg-white hover:shadow-[0_16px_30px_-20px_rgba(19,93,132,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167daf]">
                    <div className="flex items-start justify-between">
                      <div className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone === "cyan" ? "bg-[#d8f2fa] text-[#147c9e]" : item.tone === "blue" ? "bg-[#dceafb] text-[#27669c]" : "bg-[#dff0fa] text-[#1877a5]"}`}>
                        <Icon className="h-[19px] w-[19px]" />
                      </div>
                      <span className="font-mono text-[10px] font-semibold tracking-wider text-[#94aab8]">{item.number}</span>
                    </div>
                    <div className="mt-auto pt-5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[15px] font-bold tracking-[-0.02em] text-[#18374c]">{item.title}</h3>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#397c9e] transition-transform group-hover:translate-x-1" />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[#637e90]">{item.description}</p>
                    </div>
                    <span className="absolute right-11 top-[1.65rem] rounded-full bg-[#e9f3f9] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#618298]">{item.category}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#aac7d9] bg-white/60 px-5 py-10 text-center">
              <Search className="mx-auto h-6 w-6 text-[#7292a6]" />
              <p className="mt-3 text-sm font-semibold text-[#29485d]">Tidak ada alat yang cocok</p>
              <p className="mt-1 text-xs text-[#6c8494]">Coba kata kunci lain untuk menemukan tujuan kerja.</p>
              <Button variant="outline" size="sm" className="mt-4 border-[#b6cedd] text-[#285d7c]" onClick={() => setSearch("")}>Hapus pencarian</Button>
            </div>
          )}
        </section>

        <section id="checklist" className="mt-10 scroll-mt-6 overflow-hidden rounded-[1.6rem] border border-[#c6dbe9] bg-white shadow-[0_16px_40px_-34px_rgba(16,59,86,0.55)]" aria-labelledby="checklist-heading">
          <div className="flex flex-col gap-5 border-b border-[#deebf3] bg-[#f5faff] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#d9effb] text-[#14739f]"><ListChecks className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4384a3]">Persiapan mandiri</p>
                <h2 id="checklist-heading" className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#163247]">Daftar persiapan proyek</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-[#647e8f]">Catat hal yang ingin Anda siapkan sebelum mengambil pekerjaan atau mengelola proyek.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <div className="min-w-[120px]">
                <div className="mb-1 flex justify-between text-[10px] font-semibold text-[#637e90]"><span>Progres</span><span>{percentage}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#dceaf3]"><div className="h-full rounded-full bg-[#1680ad] transition-[width] duration-300" style={{ width: `${percentage}%` }} /></div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearChecks} disabled={completedCount === 0} className="h-9 gap-1.5 px-2.5 text-xs text-[#557386] hover:bg-[#eaf4fa] hover:text-[#174968]">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <button type="button" aria-label={openChecklist ? "Tutup daftar persiapan" : "Buka daftar persiapan"} aria-expanded={openChecklist} onClick={() => setOpenChecklist((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d1e1eb] bg-white text-[#527187] transition-transform hover:bg-[#edf6fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167daf]">
                <ChevronDown className={`h-4 w-4 transition-transform ${openChecklist ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {openChecklist && (
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Kategori daftar persiapan">
                {GROUPS.map((group) => {
                  const Icon = group.icon;
                  const count = CHECKLIST_ITEMS.filter((item) => item.group === group.id && checks[item.id]).length;
                  const total = CHECKLIST_ITEMS.filter((item) => item.group === group.id).length;
                  const selected = activeGroup === group.id;
                  return (
                    <button key={group.id} role="tab" aria-selected={selected} type="button" onClick={() => setActiveGroup(group.id)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167daf] ${selected ? "border-[#277eaa] bg-[#e4f4fc] text-[#155c81]" : "border-[#d8e6ef] bg-white text-[#607b8e] hover:bg-[#f5faff]"}`}>
                      <Icon className="h-4 w-4" /> {group.title}<span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${selected ? "bg-[#c8e8f7] text-[#155c81]" : "bg-[#edf3f7] text-[#718695]"}`}>{count}/{total}</span>
                    </button>
                  );
                })}
              </div>

              {GROUPS.filter((group) => group.id === activeGroup).map((group) => (
                <div key={group.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <p className="text-xs text-[#6a8291]">{group.intro}</p>
                  </div>
                  <div className="divide-y divide-[#e8f0f5] rounded-xl border border-[#deebf2]">
                    {CHECKLIST_ITEMS.filter((item) => item.group === group.id).map((item, index) => {
                      const checked = !!checks[item.id];
                      return (
                        <label key={item.id} className={`group flex cursor-pointer items-start gap-3 px-3.5 py-3.5 transition-colors hover:bg-[#f7fbfe] sm:px-4 ${checked ? "bg-[#f7fbfd]" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCheck(item.id)}
                            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-[#b8cdd9] accent-[#177eaa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1680ad] focus-visible:ring-offset-2"
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm font-semibold ${checked ? "text-[#668091] line-through decoration-[#9eb5c3]" : "text-[#254357]"}`}>{item.title}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-[#748b99]">{item.detail}</span>
                          </span>
                          <span className="mt-1 font-mono text-[10px] text-[#9aadb9]">{String(index + 1).padStart(2, "0")}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#d7e8f1] bg-[#f2f9fd] px-4 py-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#267ba1]" />
                <p className="text-[11px] leading-[1.65] text-[#587486]">
                  <strong className="font-bold text-[#31576d]">Catatan:</strong> Daftar ini hanya tersimpan di browser ini untuk akun Anda dan merupakan alat bantu persiapan, bukan penetapan persyaratan resmi. Kebutuhan dapat berbeda menurut proyek dan otoritas terkait. Periksa ketentuan yang berlaku sebelum mengambil keputusan.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[#8095a2]" aria-live="polite">
                <span>{storageKey ? storageAvailable ? "Tersimpan di browser ini" : "Penyimpanan browser tidak tersedia; perubahan tidak tersimpan" : "Menunggu identitas akun untuk memuat daftar"}</span>
                {completedCount === CHECKLIST_ITEMS.length && <span className="inline-flex items-center gap-1 font-semibold text-[#287493]"><CheckCheck className="h-3.5 w-3.5" /> Semua catatan selesai</span>}
              </div>
            </div>
          )}
        </section>

        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#c7dce9] bg-[#dff0fa] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-[#337c9f]"><BriefcaseBusiness className="h-4 w-4" /></div>
            <div><p className="text-sm font-bold text-[#1e465e]">Siap bergerak?</p><p className="mt-0.5 text-xs text-[#587a8d]">Lihat peluang pekerjaan yang tersedia di KerjaProyek.</p></div>
          </div>
          <Link href="/jobs" className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#16364b] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#205471] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147eaf] focus-visible:ring-offset-2 focus-visible:ring-offset-[#dff0fa]">
            Lihat proyek <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-medium uppercase tracking-[0.13em] text-[#8198a7]">
          <span>KerjaProyek / Ruang Kerja</span>
          <span>Kerja yang jelas. Catatan yang rapi.</span>
        </footer>
      </div>
    </div>
  );
}
