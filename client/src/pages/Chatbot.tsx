import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Send, Bot, User, HardHat, ChevronRight, Loader2,
  ExternalLink, Zap, MessageSquare, ArrowRight, Building2,
  DollarSign, Shield, Wrench, BookOpen, GraduationCap,
  Briefcase, Newspaper, Calculator, Trophy, BarChart2, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/hooks/useUser";
import { getInitials, formatRelativeTime } from "@/lib/utils";

interface AgentResponse {
  agentId: string; agentName: string; domain: string;
  answer: string; confidence: number; references?: string[];
}
interface AIResult {
  question: string; primaryAnswer: AgentResponse;
  supportingAnswers: AgentResponse[]; relatedQuestions: string[];
}
interface Message {
  id: number; role: "user" | "assistant"; content: string; createdAt: string;
  agentId?: string; agentName?: string; agentDomain?: string;
  confidence?: number; references?: string[];
  supportingAnswers?: AgentResponse[]; relatedQuestions?: string[];
  isMultiAgent?: boolean; actionLinks?: { label: string; href: string }[];
}

const AGENT_CONF: Record<string, { icon: string; color: string; bg: string }> = {
  struktur: { icon: "🏗️", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  arsitektur: { icon: "📐", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  mep: { icon: "⚡", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  k3: { icon: "⛑️", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  manajemen: { icon: "📊", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  material: { icon: "🧱", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
};

// ── Technical keyword detection ─────────────────────────────────────────────
const TECHNICAL_KEYWORDS = [
  "pondasi","kolom","balok","plat","beton","besi","struktur","retak","tulangan","cor",
  "sloof","pile","pile cap","retaining","dinding geser","shear wall",
  "imb","pbg","izin","denah","atap","arsitektur","kdb","klb","gsb","rth","rtb",
  "listrik","plambing","air","pompa","ac","hvac","pipa","kabel","mcb","panel",
  "k3","keselamatan","apd","helm","scaffolding","kecelakaan","ibpr","jsa","sio",
  "rab","schedule","manajemen","proyek","procurement","spk","bill of quantity",
  "semen","pasir","keramik","bata","hebel","waterproofing","material","sni",
  "berapa","bagaimana","cara","ukuran","campuran","tebal","diameter","mutu",
  "kuat tekan","tegangan","momen","defleksi","tulangan","bekisting",
];

function isTechnical(q: string): boolean {
  const lower = q.toLowerCase();
  return TECHNICAL_KEYWORDS.some(kw => lower.includes(kw)) && q.split(" ").length >= 3;
}

// ── Knowledge Base — Platform-aware responses ───────────────────────────────
const KB: Array<{ keys: string[]; response: string; links?: { label: string; href: string }[] }> = [
  // Greetings
  {
    keys: ["halo", "hallo", "hai", "hello", "selamat pagi", "selamat siang", "selamat malam", "assalamualaikum"],
    response: `Halo! Selamat datang di AI Assistant KerjaProyek 👷\n\nSaya bisa membantu Anda dengan:\n\n🤖 **Dukungan AI** — pertanyaan teknis konstruksi\n📚 **Knowledge Base** — info harga, platform, dan tips\n🔗 **Navigasi Fitur** — Klinika, Bimtek, Estimator, dan lainnya\n\nApa yang bisa saya bantu hari ini?`,
    links: [{ label: "Klinika Teknis", href: "/klinika" }, { label: "AI Chatbot Help", href: "/chatbot" }],
  },
  { keys: ["terima kasih", "makasih", "thx", "thanks", "oke", "ok siap"], response: "Sama-sama! 😊 Hubungi saya lagi kapanpun ya.\n\n💡 **Tips:** Untuk jawaban teknis yang lebih dalam dengan referensi SNI, kunjungi **Klinika Teknis** — forum tanya jawab dengan dukungan AI spesialis konstruksi!", links: [{ label: "Buka Klinika", href: "/klinika" }] },

  // Harga & Biaya
  {
    keys: ["harga renovasi", "biaya renovasi", "renovasi rumah berapa", "ongkos renovasi"],
    response: `Biaya renovasi rumah sangat bergantung pada lokasi, material, kondisi bangunan, dan ruang lingkup pekerjaan.\n\nEstimator Biaya membantu menyusun rincian material dan upah berdasarkan kebutuhan proyek serta acuan SNI dan AHSP yang relevan.\n\n💡 Gunakan **Estimator Biaya** untuk menyusun perkiraan yang lebih sesuai dengan konteks proyek Anda.`,
    links: [{ label: "Hitung RAB Sekarang", href: "/cost-estimator" }, { label: "Cari Tukang Renovasi", href: "/experts?category=Renovasi" }],
  },
  {
    keys: ["biaya bangun rumah", "harga konstruksi baru", "bangun rumah berapa", "biaya membangun"],
    response: `Biaya membangun rumah baru perlu disusun berdasarkan lokasi, desain, spesifikasi material, kondisi lahan, dan ruang lingkup pekerjaan.\n\nEstimator Biaya dapat membantu memecah kebutuhan menjadi komponen material, upah, dan pekerjaan sehingga lebih mudah ditinjau sebelum negosiasi.`,
    links: [{ label: "Estimator Biaya Detail", href: "/cost-estimator" }, { label: "Posting Proyek", href: "/jobs/create" }],
  },
  {
    keys: ["harga cat", "biaya pengecatan", "ongkos cat"],
    response: `Biaya pengecatan dinding:\n\n**Material:**\n• Cat ekonomis: Rp 40-60 rb/m²\n• Cat standar (Dulux/Jotun): Rp 60-90 rb/m²\n• Cat premium (waterproof): Rp 90-140 rb/m²\n\n**Ongkos tukang cat:**\n• Kepala tukang: Rp 150.750/hari (AHSP)\n• Tukang terampil: Rp 70.750/hari\n\n⚡ Urutan benar: Amplas → Tambal → Alkali sealer → Cat dasar → Cat finish (2 lapis)`,
    links: [{ label: "Cari Tukang Cat", href: "/experts?category=Pengecatan" }, { label: "Hitung RAB", href: "/cost-estimator" }],
  },
  {
    keys: ["harga keramik", "biaya pasang lantai", "ongkos keramik", "pemasangan keramik"],
    response: `Biaya keramik dan granit sangat bergantung pada jenis material, kualitas, lokasi, luas pekerjaan, dan tingkat kerumitan pemasangan.\n\n⚠️ **Hal yang perlu diperhatikan:**\n• Pilih material sesuai fungsi ruang dan kondisi lapangan\n• Pastikan permukaan siap sebelum pemasangan\n• Gunakan acuan standar pemasangan yang relevan\n• Periksa kemiringan dan kerataan sebelum pekerjaan diselesaikan\n\n💡 Gunakan Estimator Biaya untuk menyusun perkiraan berdasarkan konteks proyek Anda.`,
    links: [{ label: "Cari Tukang Lantai", href: "/experts?category=Lantai" }, { label: "Estimator Biaya", href: "/cost-estimator" }],
  },
  {
    keys: ["harga listrik", "biaya instalasi listrik", "pasang listrik", "instalatir"],
    response: `Biaya instalasi listrik (2025):\n\n**Per titik lampu/stop kontak:** Rp 150-350 rb\n**Panel MCB 10 grup:** Rp 1,5 – 3,5 juta\n**Instalasi rumah 36m²:** Rp 5 – 12 juta\n**Instalasi rumah 100m²:** Rp 15 – 30 juta\n\n**Tarif tukang listrik:** Rp 130-170 rb/hari\n\n⚠️ **Wajib:** Dikerjakan instalatir berlisensi PLN/Kemnaker. SLO (Sertifikat Laik Operasi) wajib sebelum nyala PLN.`,
    links: [{ label: "Cari Teknisi MEP", href: "/experts?category=Listrik" }, { label: "Tanya Agen MEP", href: "/klinika" }],
  },
  {
    keys: ["harga pondasi", "biaya pondasi", "pondasi berapa"],
    response: `Biaya pondasi (2025):\n\n**Pondasi batu kali:** Rp 1,8 – 2,5 juta/m³\n**Pondasi tapak beton:** Rp 2 – 3,5 juta/titik\n**Strauss pile (Ø30):** Rp 350-600 rb/meter\n**Mini pile (Ø25):** Rp 500-800 rb/meter\n**Bor pile (Ø40):** Rp 800 rb – 1,5 juta/meter\n\n📐 Jenis pondasi bergantung: beban bangunan, daya dukung tanah, dan kedalaman tanah keras.`,
    links: [{ label: "Tanya Agen Struktur AI", href: "/klinika" }, { label: "Cari Ahli Pondasi", href: "/experts" }],
  },
  {
    keys: ["upah tukang", "gaji tukang", "berapa bayar tukang", "tarif mandor"],
    response: `Upah tukang standar AHSP 2025:\n\n**Harian:**\n• Mandor/Kepala Pelaksana: Rp 200.000/hari\n• Kepala Tukang: Rp 150.750/hari\n• Tukang Terampil: Rp 120-130 rb/hari\n• Tukang Setengah Terampil: Rp 90-100 rb/hari\n• Pekerja Helper: Rp 80.000/hari\n\n**Borongan tipikal:**\n• Pasang bata: Rp 80-120 rb/m²\n• Plesteran: Rp 35-60 rb/m²\n• Pengecatan: Rp 40-70 rb/m²\n• Pasang keramik: Rp 50-90 rb/m²`,
    links: [{ label: "Lihat Referensi Upah", href: "/job-board" }, { label: "Cari Tukang", href: "/experts" }],
  },

  // Platform Features
  {
    keys: ["kerjaproyek itu apa", "platform apa", "tentang kerjaproyek", "cara kerja kerjaproyek", "fitur apa saja"],
    response: `**KerjaProyek** adalah marketplace konstruksi dengan dukungan AI untuk membantu alur kerja proyek 🏗️\n\n**Untuk Owner/Boher:**\n• 👷 Cari tukang dan tenaga ahli berdasarkan kompetensi\n• 💰 Estimator Biaya RAB berbasis SNI & AHSP\n• 🔮 Brain Project — dukungan supervisi kontrak\n• 📝 Kontrak digital dan milestone yang lebih tertata\n\n**Untuk Tukang/Mandor:**\n• 📋 Cari proyek sesuai keahlian\n• 🎓 Bimtek dari lembaga dan sumber yang relevan\n• 🏆 Simulasi uji kompetensi SKKNI/BNSP\n• 📚 Materi teknis K3, Struktur, dan SNI\n\n**Untuk Semua:**\n• 🧠 Klinika Teknis — tanya jawab dengan dukungan AI\n• 🗞️ Job Board — peluang kerja konstruksi\n• 💬 AI Chatbot untuk membantu kebutuhan Anda`,
    links: [{ label: "Dashboard Saya", href: "/dashboard" }, { label: "Daftar Gratis", href: "/register" }],
  },
  {
    keys: ["klinika", "klinika teknis", "forum teknis", "tanya teknis", "agen ai konstruksi"],
    response: `**Klinika Teknis KerjaProyek** 🧠\n\nForum tanya jawab teknis konstruksi Indonesia dengan dukungan spesialis:\n\n🏗️ **Struktur** — beton, baja, pondasi, dan standar terkait\n📐 **Arsitektur** — denah, PBG, KDB, dan estetika\n⚡ **MEP** — listrik PUIL, plambing, dan HVAC\n⛑️ **K3** — APD, JSA, IBPR, dan regulasi terkait\n📊 **Manajemen** — RAB, jadwal, kontrak, dan pengelolaan proyek\n🧱 **Material** — standar material, spesifikasi, dan harga\n\nSetiap jawaban dilengkapi referensi standar dan perspektif pendukung.`,
    links: [{ label: "Buka Klinika Teknis", href: "/klinika" }, { label: "Tanya via Chatbot", href: "/chatbot" }],
  },
  {
    keys: ["brain project", "supervisi ai", "pengawasan kontrak", "supervisi proyek"],
    response: `**Brain Project** 🔮 — Sistem Supervisi AI Real-time\n\nMembantu memonitor kontrak aktif Anda melalui beberapa sudut pandang:\n\n🛡️ **Contract Compliance** — validasi ketaatan kontrak\n🔗 **Construction Sequence** — urutan kerja sesuai SNI\n💰 **Budget Health** — monitoring anggaran vs realisasi\n📈 **Progress Monitor** — tracking milestone aktif\n🔍 **Field Quality** — indikator kualitas lapangan\n\n**Output:** Ringkasan kesehatan, faktor risiko, dan rekomendasi tindakan\n\n**Cara akses:** Dashboard → pilih kontrak aktif → klik "Brain Project"`,
    links: [{ label: "Buka Brain Project", href: "/dashboard" }, { label: "Lihat Kontrak", href: "/contracts" }],
  },
  {
    keys: ["bimtek", "pelatihan konstruksi", "kursus konstruksi", "training konstruksi"],
    response: `**Bimtek & Pelatihan KerjaProyek** 🎓\n\nPilihan pelatihan dari lembaga dan sumber resmi:\n\n🏛️ **Pemerintah:** PUPR, Kemnaker, Bina Konstruksi\n🎯 **Sertifikasi:** BNSP, K3 Umum, SKA/SKT\n💻 **Online/Hybrid:** BIM, Estimasi RAB, dan SNI\n\n**Kategori:**\nStruktur & Sipil · RAB & Estimasi · BIM & Digital\nK3 Konstruksi · Manajemen Proyek · MEP · Hukum Kontrak\n\n**Format:** Online · Offline · Hybrid · Self-paced\n**Biaya:** Tergantung pelatihan dan penyelenggara; periksa detail pada halaman program.`,
    links: [{ label: "Lihat Bimtek", href: "/bimtek" }, { label: "Uji Kompetensi SKKNI", href: "/competency-test" }],
  },
  {
    keys: ["uji kompetensi", "skkni", "bnsp", "sertifikat konstruksi", "skk", "kkni level"],
    response: `**Uji Kompetensi SKKNI di KerjaProyek** 🏆\n\nSimulasi latihan uji BNSP:\n\n**Level KKNI Tersedia:** Level 1-9\n• Level 1-2: Operator lapangan\n• Level 3-4: Teknisi & Supervisor\n• Level 5-6: Kepala Pelaksana & Ahli Muda\n• Level 7-8: Ahli Madya & Utama\n• Level 9: Konsultan & Advisor\n\n**Bidang:** K3, Struktur, MEP, Manajemen, Estimasi, Arsitektur\n\n**Fitur:** Bank soal SKKNI + penjelasan jawaban detail + simulasi timer BNSP\n\n💡 Sertifikasi BNSP = tarif proyek lebih tinggi + profil lebih dipercaya!`,
    links: [{ label: "Mulai Uji Kompetensi", href: "/competency-test" }, { label: "Materi Belajar", href: "/study-materials" }],
  },
  {
    keys: ["estimator biaya", "rab", "rencana anggaran", "hitung rab", "estimasi proyek"],
    response: `**Estimator Biaya RAB KerjaProyek** 💰\n\nKalkulator anggaran proyek berbasis SNI & AHSP:\n\n**Fitur:**\n• Kategori pekerjaan konstruksi yang relevan\n• Pertimbangan lokasi dan faktor biaya\n• Pilihan tingkat kualitas: Ekonomis · Standar · Premium\n• Rincian material, upah, dan overhead\n• Perkiraan timeline pengerjaan\n\n⚡ Gunakan hasilnya sebagai bahan awal untuk diskusi dan negosiasi proyek.`,
    links: [{ label: "Hitung RAB Sekarang", href: "/cost-estimator" }, { label: "Tanya Agen Manajemen", href: "/klinika" }],
  },
  {
    keys: ["job board", "lowongan konstruksi", "cari kerja konstruksi", "lowongan tukang", "loker konstruksi"],
    response: `**Job Board KerjaProyek** 🗞️\n\nAgregasi lowongan konstruksi yang diperbarui mengikuti ketersediaan sumber:\n\n**Sumber:** Loker.id · Indeed · Jobstreet · Jooble · OLX · KerjaProyek\n\n**Tipe Pekerjaan:**\n• Full time: Supervisor, Manager, Engineer\n• Harian: Mandor, Tukang spesialis\n• Borongan: Kontraktor, Tim tukang\n• Kontrak: Pengawas, QC/QA\n• Part time: Konsultan, Drafter\n\n**Upah:** Periksa detail setiap lowongan dan gunakan referensi AHSP sebagai bahan pertimbangan.`,
    links: [{ label: "Buka Job Board", href: "/job-board" }, { label: "Daftar Jadi Tukang", href: "/register" }],
  },
  {
    keys: ["materi belajar", "modul konstruksi", "belajar konstruksi", "study material"],
    response: `**Materi Belajar KerjaProyek** 📚\n\nModul teknis gratis untuk tenaga konstruksi:\n\n**Tersedia:**\n📋 K3 Konstruksi Gedung Bertingkat\n🏗️ Struktur Beton & Penulangan\n📐 Manajemen Proyek Konstruksi\n📊 Estimasi Biaya & RAB\n⚡ MEP — Instalasi Listrik & Plambing\n🧱 Spesifikasi Material & SNI\n\n**Format:** Modul teks + topik detail + tips ujian BNSP\n**Level:** Disesuaikan per jenjang KKNI`,
    links: [{ label: "Buka Materi Belajar", href: "/study-materials" }, { label: "Uji Kompetensi", href: "/competency-test" }],
  },
  {
    keys: ["posting proyek", "cara post proyek", "membuat proyek", "buat lowongan"],
    response: `**Cara Posting Proyek di KerjaProyek** 📋\n\n1. **Login** → Dashboard → "Buat Proyek"\n2. **Isi detail:** Judul, kategori, deskripsi lengkap\n3. **Estimasi budget:** Gunakan Estimator RAB kami dulu!\n4. **Lokasi & deadline**\n5. **Submit** → Tukang mulai melamar\n\n🤖 **Fitur AI saat posting:**\n• PriceSuggestWidget — membantu memberi konteks harga\n• AI Worker Matching — mencocokkan tukang berdasarkan kebutuhan\n• AgentRank — membantu meninjau lamaran`,
    links: [{ label: "Buat Proyek Sekarang", href: "/jobs/create" }, { label: "Estimator RAB dulu", href: "/cost-estimator" }],
  },
  {
    keys: ["kontrak", "surat perjanjian", "spk", "kontrak digital"],
    response: `**Kontrak Digital KerjaProyek** 📝\n\nKontrak konstruksi yang wajib memuat:\n\n✅ Identitas & legalitas kedua pihak\n✅ Deskripsi pekerjaan + spesifikasi material (SNI)\n✅ Nilai kontrak & jadwal pembayaran\n✅ Milestone & target penyelesaian\n✅ Sanksi keterlambatan & penalty\n✅ Garansi pekerjaan sesuai kesepakatan\n✅ Mekanisme penyelesaian sengketa\n\n🔐 **Di KerjaProyek:**\n• Kontrak digital terenkripsi\n• Tanda tangan elektronik\n• Milestone dibantu AI\n• Brain Project membantu supervisi`,
    links: [{ label: "Lihat Kontrak Saya", href: "/contracts" }, { label: "Brain Project", href: "/dashboard" }],
  },
  {
    keys: ["milestone", "dp berapa", "uang muka", "tahapan pembayaran", "bayar kapan"],
    response: `**Panduan Milestone & Pembayaran** 💰\n\nBesaran uang muka dan tahapan pembayaran sebaiknya disepakati berdasarkan ruang lingkup, kebutuhan material, progres pekerjaan, dan kemampuan kedua pihak.\n\n⚠️ Hindari uang muka yang terlalu besar sebelum pekerjaan dan perlindungan kontraknya jelas.\n\n**Struktur milestone yang baik:**\n• Hubungkan pembayaran dengan hasil kerja yang dapat diperiksa\n• Tetapkan bukti progres untuk setiap tahap\n• Cantumkan ketentuan serah terima dan retensi\n• Dokumentasikan setiap perubahan kesepakatan\n\n🤖 AI KerjaProyek membantu menyusun milestone berdasarkan kategori dan nilai kontrak.`,
    links: [{ label: "Lihat Kontrak", href: "/contracts" }, { label: "Apa itu Brain Project?", href: "/dashboard" }],
  },
  {
    keys: ["memilih tukang", "tips cari tukang", "cara pilih tukang", "tukang terpercaya"],
    response: `**Tips Memilih Tukang/Mandor Terpercaya** 👷\n\n✅ **Lakukan:**\n• Cek portofolio & ulasan dari klien sebelumnya\n• Verifikasi sertifikasi SKK/KKNI & BNSP\n• Minta referensi proyek serupa\n• Bandingkan beberapa penawaran\n• Selalu buat kontrak sebelum mulai\n• Bayar berdasarkan milestone, bukan langsung lunas\n\n❌ **Red Flags:**\n• Meminta uang muka besar sebelum pekerjaan jelas\n• Menolak tanda tangan kontrak\n• Tidak bisa menunjukkan portofolio\n• Harga jauh di bawah kewajaran tanpa penjelasan\n\n💡 Di KerjaProyek, periksa status verifikasi, ulasan, dan kecocokan keahlian pada profil sebelum memilih.`,
    links: [{ label: "Cari Tukang Terverifikasi", href: "/experts" }, { label: "Sistem Keamanan Kontrak", href: "/contracts" }],
  },
  {
    keys: ["sengketa", "dispute", "masalah kontrak", "tukang bermasalah", "gak selesai"],
    response: `**Penyelesaian Sengketa di KerjaProyek** ⚖️\n\nJika ada masalah dengan tukang/owner:\n\n**Langkah 1:** Dokumentasikan masalah dengan foto + catatan\n**Langkah 2:** Komunikasikan via pesan platform\n**Langkah 3:** Ajukan sengketa resmi di KerjaProyek\n**Langkah 4:** Admin mediasi berdasarkan kontrak & bukti\n\n**Perlindungan:**\n• Pembayaran melalui milestone (bukan langsung ke tukang)\n• Brain Project rekam seluruh riwayat progress\n• Kontrak digital sebagai bukti hukum\n\n⚡ Selalu gunakan kontrak digital + milestone — bukan bayar cash langsung!`,
    links: [{ label: "Ajukan Sengketa", href: "/disputes" }, { label: "Lihat Kontrak", href: "/contracts" }],
  },
  {
    keys: ["profil tukang", "lengkapi profil", "sertifikasi bnsp", "kkni", "skk"],
    response: `**Tips Profil Tukang yang Kuat** 👤\n\n**Sebaiknya dilengkapi agar mudah dipahami calon klien:**\n📸 Foto profil profesional\n📝 Bio yang jelas dan spesifik\n🔧 Keahlian teknis yang dikuasai\n📍 Lokasi dan area kerja\n🏅 Jenjang kompetensi KKNI\n📜 Sertifikasi yang relevan\n🏗️ Portofolio proyek dengan foto\n\n💡 **Manfaat profil lengkap:**\n• Membantu calon klien memahami kompetensi Anda\n• Memberi konteks yang lebih baik untuk rekomendasi AI\n• Memudahkan pembahasan ruang lingkup pekerjaan\n• Menampilkan status verifikasi pada profil`,
    links: [{ label: "Edit Profil Saya", href: "/profile/edit" }, { label: "Akses Bimtek", href: "/bimtek" }],
  },
  {
    keys: ["daftar", "register", "buat akun", "cara daftar", "biaya daftar", "gratis"],
    response: `**Cara Daftar di KerjaProyek** 🆓\n\nPendaftaran tersedia tanpa biaya pendaftaran.\n\n**Langkah:**\n1. Klik "Daftar" di kanan atas\n2. Isi nama, email, password\n3. Pilih peran: **Owner/Boher** atau **Tukang/Mandor**\n4. Verifikasi email\n5. Lengkapi profil (untuk tukang: upload SKK/KKNI)`,
    links: [{ label: "Daftar Sekarang", href: "/register" }, { label: "Masuk", href: "/login" }],
  },
  {
    keys: ["sni", "standar nasional", "peraturan konstruksi", "regulasi bangunan"],
    response: `**SNI & Regulasi Konstruksi Indonesia** 📋\n\n**Standar Struktur:**\n• SNI 1726:2019 — Ketahanan gempa bangunan gedung\n• SNI 2847:2019 — Beton struktural untuk bangunan gedung\n• SNI 1727:2020 — Beban minimum untuk bangunan gedung\n• SNI 03-2394:2008 — Bangunan sederhana tidak bertingkat\n\n**Material:**\n• SNI 07-2052:2017 — Baja tulangan beton\n• SNI 15-2049:2004 — Semen Portland\n\n**MEP:**\n• PUIL 2011 — Persyaratan umum instalasi listrik\n• SNI 03-7065:2005 — Tata cara perencanaan sistem plambing\n\n**Perizinan:**\n• PP 16/2021 — PBG (menggantikan IMB)`,
    links: [{ label: "Tanya Agen AI SNI", href: "/klinika" }, { label: "Materi SNI", href: "/study-materials" }],
  },
  {
    keys: ["k3", "keselamatan kerja", "apd konstruksi", "kecelakaan kerja"],
    response: `**K3 Konstruksi — Wajib Diketahui** ⛑️\n\n**APD Wajib:**\n✅ Helm proyek (SNI 8685:2018)\n✅ Sepatu safety (SNI 0111:2009)\n✅ Rompi reflektif\n✅ Full body harness (ketinggian ≥1,8m)\n✅ Sarung tangan\n✅ Kacamata safety (las/gerinda/batuan)\n✅ Masker debu/gas (sesuai potensi bahaya)\n\n**Dokumen K3 Wajib:**\n• IBPR (Identifikasi Bahaya & Penilaian Risiko)\n• JSA (Job Safety Analysis) per aktivitas\n• Izin kerja khusus: hot work, confined space, elevated\n• MSDS untuk bahan kimia\n\n⚠️ Wajib daftar **BPJS Ketenagakerjaan** sebelum bekerja!`,
    links: [{ label: "Tanya Agen K3", href: "/klinika" }, { label: "Materi K3", href: "/study-materials" }],
  },
];

function getKBResponse(query: string): { response: string; links?: { label: string; href: string }[] } | null {
  const q = query.toLowerCase().trim();
  for (const item of KB) {
    if (item.keys.some(k => q.includes(k))) return { response: item.response, links: item.links };
  }
  const words = q.split(/\s+/).filter(w => w.length > 3);
  for (const item of KB) {
    for (const word of words) {
      if (item.keys.some(k => k.includes(word) || word.includes(k.split(" ")[0]))) {
        return { response: item.response, links: item.links };
      }
    }
  }
  return null;
}

// ── Category config ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: <DollarSign className="h-4 w-4" />, label: "Harga", queries: ["Biaya renovasi 100m²?", "Harga pasang keramik?", "Upah mandor per hari?"] },
  { icon: <Wrench className="h-4 w-4" />, label: "Teknis", queries: ["Berapa tebal plat lantai 4m?", "Mutu beton K-225 untuk apa?", "Campuran plesteran dinding?"] },
  { icon: <Shield className="h-4 w-4" />, label: "K3", queries: ["APD wajib di proyek?", "Cara buat JSA konstruksi?", "Syarat BPJS tukang?"] },
  { icon: <Building2 className="h-4 w-4" />, label: "Struktur", queries: ["Pondasi tanah bekas sawah?", "Kolom rumah 2 lantai?", "Cara deteksi retak struktural?"] },
  { icon: <Zap className="h-4 w-4" />, label: "MEP", queries: ["AC untuk ruang 5×6m?", "Ukuran pipa air 2 lantai?", "Standar PUIL 2011?"] },
  { icon: <BookOpen className="h-4 w-4" />, label: "Platform", queries: ["Cara posting proyek?", "Apa itu Brain Project?", "Cara pakai Klinika Teknis?"] },
  { icon: <GraduationCap className="h-4 w-4" />, label: "Bimtek", queries: ["Ada bimtek K3 online?", "Cara dapat sertifikat BNSP?", "Bimtek untuk KKNI level 6?"] },
  { icon: <Newspaper className="h-4 w-4" />, label: "Lowongan", queries: ["Lowongan mandor di Jakarta?", "Gaji site supervisor?", "Cara daftar jadi tukang?"] },
];

const QUICK_SUGGESTIONS = [
  "Berapa tebal plat lantai rumah 2 lantai bentang 4m?",
  "Pondasi yang cocok untuk tanah bekas sawah?",
  "APD wajib saat kerja di ketinggian >4 meter?",
  "Cara menghitung kebutuhan semen untuk plesteran?",
  "Biaya renovasi kamar mandi ukuran 2×3m?",
  "Dokumen apa saja untuk mengurus PBG (IMB baru)?",
];

// ── Feature quick links ─────────────────────────────────────────────────────
const FEATURE_LINKS = [
  { icon: "🧠", label: "Klinika", href: "/klinika" },
  { icon: "💰", label: "Estimator", href: "/cost-estimator" },
  { icon: "🔮", label: "Brain Project", href: "/dashboard" },
  { icon: "🎓", label: "Bimtek", href: "/bimtek" },
  { icon: "🗞️", label: "Lowongan", href: "/job-board" },
  { icon: "🏆", label: "Uji SKKNI", href: "/competency-test" },
];

function formatMessage(text: string): ReactNode {
  return text.split("\n").flatMap((line, lineIndex) => {
    const parts = line.split(/(\*\*[^*\n]+\*\*)/g);
    const formattedLine = parts.map((part, partIndex) => {
      const boldMatch = part.match(/^\*\*([^*\n]+)\*\*$/);
      if (!boldMatch) return part;
      return <strong key={`bold-${lineIndex}-${partIndex}`}>{boldMatch[1]}</strong>;
    });

    return lineIndex === 0
      ? formattedLine
      : [<br key={`break-${lineIndex}`} />, ...formattedLine];
  });
}

export default function ChatbotPage() {
  const { data: user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1, role: "assistant",
      content: `Halo! Saya **AI Assistant KerjaProyek** 👷\n\nSaya membantu melalui dua pendekatan:\n🤖 **Dukungan AI** — pertanyaan teknis konstruksi dari sudut pandang Struktur, Arsitektur, MEP, K3, Manajemen, dan Material\n📚 **Knowledge Base** — info harga, platform, fitur, dan tips\n\nKetik pertanyaan atau pilih kategori di bawah!`,
      createdAt: new Date().toISOString(),
      actionLinks: FEATURE_LINKS,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [showRelated, setShowRelated] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now(), role: "user",
      content: text.trim(), createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setActiveCategory(null);

    if (isTechnical(text)) {
      // Multi-Agent path
      const possibleAgents = ["🏗️ Agen Struktur", "📐 Agen Arsitektur", "⚡ Agen MEP", "⛑️ Agen K3", "📊 Agen Manajemen"];
      setLoadingAgents(possibleAgents.slice(0, 2 + Math.floor(Math.random() * 2)));
      try {
        const res = await fetch("/api/klinika/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ question: text }),
        });
        const data: AIResult = await res.json();
        const pa = data.primaryAnswer;
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "assistant",
          content: pa.answer,
          createdAt: new Date().toISOString(),
          agentId: pa.agentId, agentName: pa.agentName,
          agentDomain: pa.domain, confidence: pa.confidence,
          references: pa.references,
          supportingAnswers: data.supportingAnswers,
          relatedQuestions: data.relatedQuestions,
          isMultiAgent: true,
          actionLinks: [
            { label: "Diskusi di Klinika", href: "/klinika" },
            { label: "Cari Ahli Terkait", href: "/experts" },
          ],
        }]);
      } catch {
        const fallback = getKBResponse(text);
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "assistant",
          content: fallback?.response || "Maaf, sistem sedang sibuk. Silakan coba lagi atau kunjungi **Klinika Teknis** untuk jawaban lebih detail.",
          createdAt: new Date().toISOString(),
          actionLinks: [{ label: "Buka Klinika", href: "/klinika" }],
        }]);
      }
    } else {
      // KB path
      await new Promise(r => setTimeout(r, 350 + Math.random() * 250));
      const kbResult = getKBResponse(text);
      if (kbResult) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "assistant",
          content: kbResult.response,
          createdAt: new Date().toISOString(),
          actionLinks: kbResult.links,
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "assistant",
          content: `Saya belum punya jawaban spesifik untuk **"${text}"**.\n\nCoba tanyakan dengan kata kunci seperti:\n• "harga renovasi", "biaya listrik", "tips pilih tukang"\n• Pertanyaan teknis: "berapa tebal beton?", "pondasi apa?"\n• Fitur platform: "cara post proyek", "apa itu Brain Project"\n\nAtau kunjungi langsung halaman yang relevan:`,
          createdAt: new Date().toISOString(),
          actionLinks: FEATURE_LINKS,
        }]);
      }
    }

    setLoading(false);
    setLoadingAgents([]);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-10 shadow-sm">
        <div className="bg-primary p-2 rounded-xl">
          <HardHat className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base">AI Assistant Konstruksi</h1>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-xs text-muted-foreground">Dukungan AI · Knowledge Base · Spesialis Konstruksi</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {FEATURE_LINKS.slice(0, 3).map(f => (
            <a key={f.href} href={f.href}
              className="text-xs bg-muted px-2 py-1 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors hidden sm:block">
              {f.icon} {f.label}
            </a>
          ))}
          <a href="/klinika" className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium hover:bg-primary/20 transition-colors">
            Klinika →
          </a>
        </div>
      </div>

      {/* ── Category Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-4 py-2 border-b overflow-x-auto no-scrollbar bg-background/90 backdrop-blur">
        {CATEGORIES.map((cat, i) => (
          <button key={i} onClick={() => setActiveCategory(activeCategory === i ? null : i)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition-all shrink-0 ${
              activeCategory === i ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted border-border text-muted-foreground"
            }`}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {activeCategory !== null && (
        <div className="px-4 py-2 border-b bg-muted/20 flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES[activeCategory].queries.map((q) => (
            <button key={q} onClick={() => sendMessage(q)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white border border-primary/30 text-primary whitespace-nowrap hover:bg-primary/5 transition-colors shrink-0">
              <ChevronRight className="h-3 w-3" /> {q}
            </button>
          ))}
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          const agentConf = msg.agentId ? AGENT_CONF[msg.agentId] : null;
          return (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                <AvatarFallback className={`text-xs ${msg.role === "assistant" ? "bg-primary text-white" : "bg-muted"}`}>
                  {msg.role === "assistant"
                    ? (agentConf ? <span className="text-sm">{agentConf.icon}</span> : <Bot className="h-4 w-4" />)
                    : (user ? getInitials(user.fullName) : <User className="h-4 w-4" />)}
                </AvatarFallback>
              </Avatar>

              <div className={`max-w-[82%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
                {/* Agent badge */}
                {msg.isMultiAgent && agentConf && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-bold ${agentConf.color}`}>
                      {agentConf.icon} {msg.agentName}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">AI Agent</Badge>
                    {msg.agentDomain && <span className="text-[10px] text-muted-foreground">{msg.agentDomain}</span>}
                    {msg.confidence && (
                      <span className="text-[10px] text-muted-foreground">· {(msg.confidence * 100).toFixed(0)}% yakin</span>
                    )}
                  </div>
                )}

                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : msg.isMultiAgent && agentConf
                      ? `${agentConf.bg} rounded-tl-sm border`
                      : "bg-muted rounded-tl-sm"
                }`}>
                  <span>{formatMessage(msg.content)}</span>
                </div>

                {/* References */}
                {msg.references && msg.references.length > 0 && (
                  <div className="p-2.5 bg-muted/60 rounded-xl border border-dashed text-xs w-full">
                    <p className="font-semibold mb-1 text-muted-foreground">📚 Referensi Standar:</p>
                    <ul className="space-y-0.5">
                      {msg.references.slice(0, 4).map(r => (
                        <li key={r} className="text-muted-foreground flex items-start gap-1">
                          <span className="shrink-0">•</span><span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supporting answers */}
                {msg.supportingAnswers && msg.supportingAnswers.length > 0 && (
                  <div className="w-full">
                    <button onClick={() => setShowRelated(showRelated === msg.id ? null : msg.id)}
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ChevronRight className={`h-3 w-3 transition-transform ${showRelated === msg.id ? "rotate-90" : ""}`} />
                      Lihat perspektif {msg.supportingAnswers.length} agen lain
                    </button>
                    {showRelated === msg.id && (
                      <div className="mt-1.5 space-y-2">
                        {msg.supportingAnswers.map(sa => {
                          const sc = AGENT_CONF[sa.agentId] || { icon: "🤖", color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
                          return (
                            <div key={sa.agentId} className={`p-3 rounded-xl border text-xs ${sc.bg}`}>
                              <p className={`font-bold mb-1 ${sc.color}`}>{sc.icon} {sa.agentName}</p>
                              <p className="leading-relaxed">{sa.answer}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Related questions */}
                {msg.relatedQuestions && msg.relatedQuestions.length > 0 && (
                  <div className="w-full p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-xs font-semibold mb-1.5 text-muted-foreground">💡 Mungkin juga ingin tahu:</p>
                    <div className="space-y-1">
                      {msg.relatedQuestions.slice(0, 3).map(rq => (
                        <button key={rq} onClick={() => sendMessage(rq)}
                          className="w-full text-left text-xs text-primary hover:underline flex items-center gap-1.5">
                          <ArrowRight className="h-3 w-3 shrink-0" />{rq}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action links */}
                {msg.actionLinks && msg.actionLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.actionLinks.map(l => (
                      <a key={l.href} href={l.href}
                        className="text-xs px-2.5 py-1 bg-white border border-primary/30 text-primary rounded-full hover:bg-primary/5 transition-colors flex items-center gap-1">
                        {l.label} <ArrowRight className="h-2.5 w-2.5" />
                      </a>
                    ))}
                  </div>
                )}

                <p className={`text-xs text-muted-foreground ${msg.role === "user" ? "text-right" : ""}`}>
                  {formatRelativeTime(msg.createdAt)}
                  {msg.isMultiAgent && <span className="ml-1.5 text-primary font-medium">· Multi-Agent AI</span>}
                </p>
              </div>
            </div>
          );
        })}

        {/* Loading */}
        {loading && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-white text-xs">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">
                  {loadingAgents.length > 0 ? "Agen AI sedang menganalisis..." : "Mencari jawaban..."}
                </span>
              </div>
              {loadingAgents.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {loadingAgents.map(a => (
                    <span key={a} className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full animate-pulse">{a}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick suggestions */}
        {messages.length <= 1 && !loading && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-muted-foreground text-center font-medium">✨ Pertanyaan populer dari pengguna KerjaProyek</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {QUICK_SUGGESTIONS.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-left text-xs p-3 rounded-xl bg-muted hover:bg-primary/5 border hover:border-primary/30 transition-all text-muted-foreground hover:text-primary flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area ──────────────────────────────────────────────────── */}
      <div className="border-t bg-background px-4 py-3 shadow-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya teknis, harga, fitur platform, K3, SNI..."
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="icon"
            className="shrink-0"
            aria-label="Kirim pesan"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-muted-foreground">
            {isTechnical(input) && input.length > 5
              ? <span className="text-primary font-semibold">🤖 → Multi-Agen AI</span>
              : <span>Teknis → Multi-Agen AI &nbsp;·&nbsp; Umum → Knowledge Base</span>}
          </p>
          <div className="flex items-center gap-2">
            <a href="/klinika" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              Forum <ExternalLink className="h-3 w-3" />
            </a>
            <a href="/cost-estimator" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              RAB Calculator
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
