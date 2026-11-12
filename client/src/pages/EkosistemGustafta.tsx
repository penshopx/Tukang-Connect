import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Compass,
  ExternalLink,
  FileCheck2,
  FileText,
  FolderKanban,
  GraduationCap,
  HardHat,
  Landmark,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

type Resource = {
  title: string;
  url: string;
  category: string;
  icon: typeof Building2;
};

const resources: Resource[] = [
  { title: "Ruang Proyek Portfolio", url: "https://gustafta.my.id/ruang-proyek", category: "Proyek & peluang", icon: FolderKanban },
  { title: "Portal Tender", url: "https://gustafta.my.id/tender", category: "Proyek & peluang", icon: BriefcaseBusiness },
  { title: "Kontraktor", url: "https://gustafta.my.id/kontraktor", category: "Proyek & peluang", icon: HardHat },
  { title: "Brain Project", url: "https://gustafta.my.id/brain-project", category: "Proyek & peluang", icon: Sparkles },
  { title: "SBU–SKK Jalur", url: "https://gustafta.my.id/#jalur-sbu-skk", category: "Sertifikasi & kompetensi", icon: GraduationCap },
  { title: "Ekosistem Kompetensi", url: "https://gustafta.my.id/kompetensi-hub", category: "Sertifikasi & kompetensi", icon: ShieldCheck },
  { title: "Portal SBU Mulai", url: "https://gustafta.my.id/cek-kesiapan-sbu", category: "Sertifikasi & kompetensi", icon: FileCheck2 },
  { title: "Portal SKK Ekosistem", url: "https://gustafta.my.id/skk", category: "Sertifikasi & kompetensi", icon: HardHat },
  { title: "Bimtek SKK", url: "https://bimtek-skk.gustafta.my.id/", category: "Sertifikasi & kompetensi", icon: GraduationCap },
  { title: "Klinik Konsultasi", url: "https://gustafta.my.id/klinik-konsultasi", category: "Konsultasi & layanan", icon: Compass },
  { title: "Bedah Dokumen", url: "https://gustafta.my.id/bedah-dokumen", category: "Konsultasi & layanan", icon: FileText },
  { title: "KonstruksiAI", url: "https://konstruksi-ai.gustafta.my.id/", category: "Konsultasi & layanan", icon: Sparkles },
  { title: "Biro Jasa", url: "https://gustafta.my.id/biro-jasa", category: "Konsultasi & layanan", icon: Wrench },
  { title: "LKPM", url: "https://lkpm-bkpm.gustafta.my.id/", category: "Administrasi & dokumen", icon: Landmark },
  { title: "LKUT–PUB", url: "https://lkut-pub.gustafta.my.id/", category: "Administrasi & dokumen", icon: Building2 },
  { title: "LexCom", url: "https://lexcom.gustafta.my.id/", category: "Administrasi & dokumen", icon: FileCheck2 },
  { title: "Ruang Simpan", url: "https://gustafta.my.id/ruang-simpan", category: "Administrasi & dokumen", icon: FolderKanban },
  { title: "Dokumen Proyek", url: "https://gustafta.my.id/dokumen-proyek", category: "Administrasi & dokumen", icon: FileText },
  { title: "EXUM-PKB", url: "https://gustafta.my.id/executive-summary", category: "Administrasi & dokumen", icon: FileCheck2 },
  { title: "Ebook", url: "https://gustafta.my.id/ebook", category: "Belajar & referensi", icon: GraduationCap },
];

const categories = [
  { name: "Semua", count: resources.length },
  { name: "Proyek & peluang", count: 4 },
  { name: "Sertifikasi & kompetensi", count: 5 },
  { name: "Konsultasi & layanan", count: 4 },
  { name: "Administrasi & dokumen", count: 6 },
  { name: "Belajar & referensi", count: 1 },
];

const shortcuts = [
  { label: "Cari proyek", href: "/jobs", icon: BriefcaseBusiness, note: "Lowongan & proyek" },
  { label: "Portofolio", href: "/portfolio", icon: FolderKanban, note: "Karya Anda" },
  { label: "Materi belajar", href: "/study-materials", icon: GraduationCap, note: "Tingkatkan keahlian" },
  { label: "Uji kompetensi", href: "/competency-test", icon: ShieldCheck, note: "Ukur kesiapan" },
  { label: "Klinika", href: "/klinika", icon: Compass, note: "Dukungan di KerjaProyek" },
  { label: "Estimasi biaya", href: "/cost-estimator", icon: Landmark, note: "Rencanakan anggaran" },
];

export default function EkosistemGustafta() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchFocused, setSearchFocused] = useState(false);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id");
    return resources.filter((resource) => {
      const matchesCategory = activeCategory === "Semua" || resource.category === activeCategory;
      const matchesQuery = !normalizedQuery
        || `${resource.title} ${resource.category}`.toLocaleLowerCase("id").includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className="min-h-[100dvh] bg-[#f3f6fa] text-[#132b4b]">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-7 lg:px-10 lg:pt-9">
        <div className="mb-7 flex items-center gap-2 text-sm text-[#60728a]">
          <span>KerjaProyek</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium text-[#18385f]">Ekosistem Gustafta</span>
        </div>

        <section className="relative isolate overflow-hidden rounded-[28px] bg-[#102d50] px-6 py-8 text-white sm:px-10 sm:py-11 lg:px-14 lg:py-14">
          <div className="absolute -right-20 -top-32 -z-10 h-[440px] w-[440px] rounded-full border border-white/10" />
          <div className="absolute -right-2 -top-16 -z-10 h-[300px] w-[300px] rounded-full border border-white/10" />
          <div className="absolute bottom-0 right-[17%] -z-10 hidden h-44 w-44 rotate-45 border border-white/10 lg:block" />
          <div className="grid items-end gap-9 lg:grid-cols-[1fr_300px]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#91bcf0]/30 bg-[#91bcf0]/10 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-[#b9d7fa]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#76b7ff]" />
                DIREKTORI EKSTERNAL
              </div>
              <h1 className="max-w-3xl text-[2.45rem] font-bold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-[3.6rem]">
                Ekosistem konstruksi,
                <span className="block text-[#8fc2ff]">terhubung dalam satu tempat.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#d1deec] sm:text-lg">
                Temukan direktori layanan Gustafta yang relevan untuk perjalanan proyek, kompetensi, dan administrasi konstruksi Anda.
              </p>
              <a href="#direktori" className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[#f1a94b] px-5 text-sm font-bold text-[#173454] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Jelajahi direktori
                <ArrowDownRight className="h-4 w-4" />
              </a>
            </div>
            <div className="hidden justify-self-end lg:block">
              <div className="relative flex h-56 w-56 items-center justify-center">
                <div className="absolute inset-4 rotate-45 border border-[#8fc2ff]/25" />
                <div className="absolute inset-9 rotate-45 border border-[#8fc2ff]/25" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-[26px] border border-[#a5cdf7]/30 bg-[#21456d] shadow-[0_20px_55px_rgba(4,15,31,0.25)]">
                  <Building2 className="h-11 w-11 text-[#b9d7fa]" strokeWidth={1.4} />
                </div>
                <span className="absolute right-2 top-8 rounded-full border border-[#a5cdf7]/30 bg-[#183b63] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#d5e8fb]">PROYEK</span>
                <span className="absolute bottom-7 left-0 rounded-full border border-[#a5cdf7]/30 bg-[#183b63] px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#d5e8fb]">KOMPETENSI</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="mt-5 flex gap-3 rounded-2xl border border-[#ead5a8] bg-[#fff9ec] px-4 py-4 sm:px-5" aria-label="Catatan layanan eksternal">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f7e9c9] text-[#805c19]">
            <ExternalLink className="h-4 w-4" />
          </div>
          <p className="text-sm leading-6 text-[#604f31]">
            <strong className="font-semibold text-[#4b3b22]">Perlu diketahui:</strong> Semua tautan di direktori ini membuka situs eksternal Gustafta. Ketersediaan dan isi layanan dikendalikan oleh masing-masing situs dan tidak terintegrasi ke dalam KerjaProyek.
          </p>
        </aside>

        <section className="mt-12" aria-labelledby="shortcut-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3977b5]">Tetap di KerjaProyek</p>
              <h2 id="shortcut-heading" className="mt-1.5 text-2xl font-bold tracking-[-0.03em] text-[#16365b]">Mulai dari ruang kerja Anda</h2>
            </div>
            <span className="text-sm text-[#6c7c90]">Pintasan internal</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {shortcuts.map(({ label, href, icon: Icon, note }) => (
              <Link key={href} href={href} className="group flex min-h-[118px] flex-col justify-between rounded-2xl border border-[#dbe4ed] bg-white p-4 shadow-[0_2px_8px_rgba(23,55,89,0.025)] transition-all hover:-translate-y-0.5 hover:border-[#a9c7e7] hover:shadow-[0_10px_24px_rgba(23,55,89,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d72b8]">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf4fb] text-[#2867a8] transition-colors group-hover:bg-[#dcecfb]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-[#91a3b7] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2867a8]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#193858]">{label}</div>
                  <div className="mt-0.5 text-xs text-[#73849a]">{note}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="direktori" className="mt-14 scroll-mt-8" aria-labelledby="directory-heading">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3977b5]">Direktori pilihan</p>
              <h2 id="directory-heading" className="mt-1.5 text-2xl font-bold tracking-[-0.03em] text-[#16365b] sm:text-3xl">Layanan Gustafta</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#6c7c90]">Pilih kategori atau cari nama layanan. Setiap pilihan akan dibuka di situs penyedianya.</p>
            </div>
            <div className={`relative w-full lg:max-w-[360px] ${searchFocused ? "z-10" : ""}`}>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8293a8]" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
                placeholder="Cari layanan atau kategori…"
                aria-label="Cari layanan Gustafta"
                className="h-12 w-full rounded-xl border border-[#d5e0eb] bg-white pl-11 pr-11 text-sm text-[#193858] shadow-sm outline-none transition focus:border-[#5d94cd] focus:ring-4 focus:ring-[#5d94cd]/10 placeholder:text-[#95a3b3]"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8091a5] transition-colors hover:bg-[#eef3f8] hover:text-[#315778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2d72b8]">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none" role="group" aria-label="Filter kategori">
            {categories.map(({ name, count }) => {
              const selected = activeCategory === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setActiveCategory(name)}
                  aria-pressed={selected}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d72b8] ${
                    selected
                      ? "border-[#1d568e] bg-[#1d568e] text-white shadow-sm"
                      : "border-[#d8e2ec] bg-white text-[#506781] hover:border-[#adc4dc] hover:bg-[#fafdff]"
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                  {name}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none ${selected ? "bg-white/15 text-white" : "bg-[#edf2f7] text-[#6d8096]"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 mt-5 flex items-center justify-between">
            <p className="text-sm text-[#718196]" aria-live="polite">
              <span className="font-semibold text-[#294968]">{filteredResources.length}</span>
              {" "}layanan ditemukan
              {query.trim() && <span> untuk “{query.trim()}”</span>}
            </p>
            <div className="hidden items-center gap-1.5 text-xs font-medium text-[#7a8ca0] sm:flex">
              <ExternalLink className="h-3.5 w-3.5" />
              Semua tautan menuju situs eksternal
            </div>
          </div>

          {filteredResources.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredResources.map(({ title, url, category, icon: Icon }, index) => (
                <a
                  key={title}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${title}, situs eksternal`}
                  className="group relative flex min-h-[144px] flex-col justify-between overflow-hidden rounded-2xl border border-[#dbe4ed] bg-white p-5 shadow-[0_2px_8px_rgba(23,55,89,0.025)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a9c7e7] hover:shadow-[0_12px_26px_rgba(23,55,89,0.085)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d72b8]"
                  style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4fb] text-[#2867a8] transition-colors group-hover:bg-[#dcecfb]">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-[#e2e9f0] bg-[#f9fbfd] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#73869b]">
                      <ExternalLink className="h-3 w-3" />
                      Eksternal
                    </span>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <div>
                      <h3 className="font-bold leading-snug text-[#193858] transition-colors group-hover:text-[#2168aa]">{title}</h3>
                      <p className="mt-1.5 text-xs text-[#78899c]">{category}</p>
                    </div>
                    <ArrowRight className="mb-0.5 h-[18px] w-[18px] shrink-0 text-[#8ba0b5] transition-all group-hover:translate-x-1 group-hover:text-[#2867a8]" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd8e5] bg-white/70 px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf1f8] text-[#55799f]">
                <Search className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-[#294968]">Belum ada layanan yang cocok</h3>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#73849a]">Coba kata pencarian lain atau tampilkan semua kategori.</p>
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveCategory("Semua"); }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#2867a8] transition-colors hover:bg-[#edf4fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2d72b8]"
              >
                Hapus filter
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        <footer className="mt-12 flex flex-col gap-3 border-t border-[#dce4ec] pt-6 text-xs leading-5 text-[#7a8a9d] sm:flex-row sm:items-center sm:justify-between">
          <p>KerjaProyek membantu Anda menavigasi ekosistem konstruksi.</p>
          <p className="inline-flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Layanan eksternal memiliki kebijakan dan ketersediaannya sendiri.
          </p>
        </footer>
      </div>
    </div>
  );
}
