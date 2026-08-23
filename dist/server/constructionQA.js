// ─── Multi-Agent Construction Technical Q&A System ──────────────────────────
// 6 Specialized Domain Agents + Orchestrator
// ─── Knowledge Bases per Agent ──────────────────────────────────────────────
const STRUKTUR_KB = {
    pondasi: `Pondasi bangunan dipilih berdasarkan kondisi tanah dan beban bangunan. Untuk rumah 1-2 lantai dengan tanah stabil: **Pondasi batu kali** (kedalaman 60-80cm) atau **pondasi footplat beton** (40×40cm s/d 60×60cm). Untuk tanah lembek/gambut: wajib gunakan **pondasi tiang pancang** atau **pondasi strauss pile** Ø250-300mm. Standar: SNI 8460:2017 (Persyaratan Perancangan Geoteknik). Uji tanah (SPT/Sondir) sangat dianjurkan sebelum memilih pondasi.`,
    kolom: `Kolom beton bertulang untuk rumah 1 lantai minimal 20×20cm dengan tulangan 4D10 dan sengkang Ø8-100. Rumah 2 lantai: 25×25cm tulangan 4D13 sengkang Ø8-150. Rumah 3 lantai: 30×30cm tulangan 6D16 sengkang Ø10-150. Mutu beton minimal K-225 (fc'=19MPa) atau K-250. Mutu besi tulangan BJTS 420 (ulir). Jarak sengkang di zona join diperketat 50mm. Referensi: SNI 2847:2019 Beton Struktural.`,
    balok: `Balok beton untuk rumah tinggal: tinggi balok = 1/12 sampai 1/10 bentang, lebar = 2/3 tinggi. Contoh bentang 4m: balok 25×35cm. Tulangan tarik minimum 2D13, tulangan tekan 2D13, tulangan geser Ø8-150. Beton K-250, besi BJTS 420. Selimut beton 20-25mm. Untuk balok di lingkungan agresif (tepi pantai): selimut 40mm + beton waterproof.`,
    plat_lantai: `Plat lantai beton untuk rumah tinggal: tebal minimum 12cm (bentang <3m) dan 15cm (bentang 3-4m). Tulangan dua arah: Ø10-150. Beton minimal K-225. Untuk lantai garasi atau beban berat: tebal 15-20cm dengan K-300. Sistem precast hollow core juga dapat digunakan untuk efisiensi biaya dan kecepatan kerja. Lendutan ijin = L/240 untuk kondisi beban normal.`,
    beton: `Campuran beton K-225 (setara fc'=18.7MPa): perbandingan volume 1:2:3 (semen:pasir:kerikil) dengan w/c ratio 0.5. Untuk pekerjaan struktur wajib uji slump (7-12cm untuk pengecoran kolom/balok). Perawatan beton (curing) minimal 7 hari dengan mempertahankan kelembaban. Beton readymix lebih konsisten: pesan dengan mutu fc' yang spesifik. SNI 2847:2019 mengatur semua persyaratan beton struktural gedung.`,
    retak: `Retak pada bangunan dikategorikan: (1) Retak rambut (<0.3mm): normal karena susut, tidak berbahaya, tutup dengan semen instan atau cat elastis. (2) Retak sedang (0.3-1mm): bisa struktural atau non-struktural, perlu investigasi. (3) Retak lebar (>1mm): BERBAHAYA, perlu penanganan segera oleh ahli struktur. Penyebab umum: settlemen diferensial, mutu beton rendah, kurang tulangan, kegagalan pondasi. Solusi: grouting epoxy untuk retak struktural, sealant elastis untuk non-struktural.`,
    besi_beton: `Besi tulangan di Indonesia: BJTS 280 (polos, fy=280MPa) dan BJTS 420 (ulir, fy=420MPa). Untuk struktur gedung: wajib pakai BJTS 420 (ulir/deform) sesuai SNI 2847:2019. Panjang sambungan minimal 40×diameter. Besi SNI wajib ada label SNI di batang. Hindari besi afkir atau tidak berlogo SNI. Diameter: 6,8,10,12,13,16,19,22,25mm. Berat: D13=1.04kg/m, D16=1.58kg/m, D19=2.23kg/m.`,
};
const ARSITEKTUR_KB = {
    imb_pbg: `IMB (Izin Mendirikan Bangunan) sudah diganti dengan **PBG (Persetujuan Bangunan Gedung)** berdasarkan PP 16/2021 tentang Bangunan Gedung. PBG diterbitkan oleh Pemda melalui sistem SIMBG (Sistem Informasi Manajemen Bangunan Gedung) online. Syarat PBG: gambar rencana arsitektur, struktur, MEP yang ditandatangani tenaga ahli bersertifikat. Setelah bangunan selesai: ajukan SLF (Sertifikat Laik Fungsi). Denda tidak punya PBG: maksimal 10% biaya bangunan.`,
    koefisien_dasar: `KDB (Koefisien Dasar Bangunan): maksimal luas lantai dasar/luas tapak. KLB (Koefisien Lantai Bangunan): total luas lantai/luas tapak. GSB (Garis Sempadan Bangunan): jarak minimal bangunan dari batas jalan. Semua diatur dalam RDTR (Rencana Detail Tata Ruang) masing-masing kota. Contoh Jakarta: zona residensial KDB 60%, KLB 1.2, GSB = ½ lebar jalan. Cek di PTSP Daerah atau aplikasi JAKI (Jakarta).`,
    denah: `Prinsip desain denah rumah yang baik: (1) Sirkulasi udara silang (cross ventilation) — buka jendela di sisi berlawanan, (2) Pencahayaan alami maksimal, (3) Zona private (kamar) terpisah dari zona publik (ruang tamu), (4) Dapur dekat pintu belakang, (5) Kamar mandi tidak menghadap kiblat (adat), (6) Lebar pintu minimum: 80cm untuk kamar, 90cm untuk KM/WC. Modul 30cm digunakan sebagai kelipatan dasar dimensi ruang.`,
    atap: `Tipe atap rumah di Indonesia: (1) Pelana: paling umum, ekonomis, perawatan mudah, (2) Perisai/Hip: lebih kuat terhadap angin, (3) Datar: untuk hunian modern/minimalis, perlu waterproofing sangat baik, (4) Mansard: dua kemiringan per sisi. Kemiringan atap: genteng tanah liat min. 30°, genteng beton min. 15°, genteng metal min. 12°, asbes/fiber min. 15°, spandek min. 5°. Rangka baja ringan lebih tahan rayap vs kayu, tetapi perlu profil yang tepat untuk bentang tertentu.`,
    warna_cat: `Pemilihan cat eksterior: gunakan cat water-based berbasis acrylic (contoh: Dulux Weathershield, Jotun Jotashield, Nippon Paint WeatherBond). Langkah pengecatan eksterior yang benar: (1) Bersihkan permukaan dari debu/jamur, (2) Dempul lubang/retakan, (3) Cat dasar alkali resistant primer 1 lapis, (4) Cat finish 2 lapis. Jangan cat di cuaca hujan atau terik >35°C. Untuk dinding lembab: gunakan waterproof sealer sebelum cat.`,
};
const MEP_KB = {
    instalasi_listrik: `Instalasi listrik rumah tinggal mengikuti PUIL 2011 (SNI 0225). Standar wajib: (1) Kabel NYM minimal 2.5mm² untuk titik lampu, 4mm² untuk stop kontak, (2) Circuit breaker (MCB) untuk tiap grup, (3) ELCB/RCCB 30mA untuk kamar mandi & dapur, (4) Grounding/pembumian resistansi <5 Ohm, (5) Konduit PVC untuk proteksi kabel. Daya listrik rumah: 900VA (10A), 1300VA, 2200VA, 3500VA. Konsultasikan dengan instalatir berlisensi PLN. SLO (Sertifikat Laik Operasi) wajib sebelum disambung PLN.`,
    plambing: `Sistem plambing rumah tinggal: (1) Air bersih: pipa PPRC (Polypropylene) untuk hot & cold, tekanan 4-6 bar, (2) Air buang/kotor: pipa PVC AW (tekanan) atau D (drainase) diameter 4" untuk toilet, 2" untuk wastafel/sink, (3) Septic tank sesuai SNI 2398:2017: minimal 2m³ untuk 5 jiwa, jarak minimal 10m dari sumber air. Slope pipa air buang minimal 2% (2cm per 1m). Water hammer dapat dicegah dengan air chamber atau shock arrester. Talang air hujan minimal diameter 3".`,
    hvac: `Penghawaan rumah tinggal: (1) Alami: jendela cross ventilation, bukaan minimal 10% luas lantai, (2) AC split: BTU/jam = panjang×lebar×tinggi ruangan×kalkulasi faktor; umumnya 1 PK = 9000 BTU = 25m² (ruangan standar). Pemasangan AC: indoor unit minimal 2.1m dari lantai, kemiringan 3° ke arah drainase, pipa refrigeran maximal 5m tanpa tambah freon, outdoor unit terlindung dari hujan langsung tapi ventilasi baik. Kapasitas air conditioning diatur dalam SNI 6572:2001.`,
    septictank: `Septic tank modern mengikuti SNI 2398:2017. Dimensi untuk keluarga 4-5 orang: kompartemen 1 = 1.2×0.9×1.2m, kompartemen 2 = 0.6×0.9×1.2m. Material: beton bertulang atau HDPE biofilter. Jarak minimal: 10m dari sumur, 5m dari batas tanah, 3m dari bangunan. Bio septic tank (biofilter): lebih ramah lingkungan, tidak perlu sedot berkala, sesuai untuk kavling terbatas. Drainase sumur resapan: 1m× 1m×2m (untuk 5 jiwa normal).`,
    pompa_air: `Pompa air rumah tangga: (1) Pompa sumur dangkal (max 9m) — otomatis pressure switch, (2) Pompa sumur dalam / jet pump (9-25m), (3) Pompa submersible (>25m). Kapasitas tangki air (ground tank + rooftank): minimal 200L/orang/hari. Pipa distribusi dari tangki ke titik: gunakan pipa PPR 3/4" dengan tekanan gravitasi 0.5-1 bar (ketinggian tangki 5-10m). Untuk perumahan modern: sistem pompa booster dengan pressure tank lebih efisien.`,
};
const K3_KB = {
    apd: `APD (Alat Pelindung Diri) wajib di proyek konstruksi sesuai Permenaker No. 8/2010: (1) Helm proyek SNI: wajib untuk semua pekerja (2) Safety shoes/sepatu safety: wajib (3) Rompi keselamatan: wajib di area aktif (4) Harness full-body: wajib kerja di ketinggian >2m (5) Sarung tangan: sesuai jenis pekerjaan (6) Kacamata/goggles: untuk las, gerinda, bor (7) Masker N95: untuk pekerjaan berdebu/cat. Sanksi tidak menggunakan APD: stop kerja oleh pengawas K3 atau direksi.`,
    kecelakaan: `Prosedur kecelakaan kerja di proyek: (1) Pertolongan pertama segera — P3K tersedia di setiap area kerja, (2) Hubungi pengawas K3 atau HSE Officer, (3) Evakuasi korban ke Puskesmas/RS terdekat, (4) Laporan kecelakaan kerja ke BPJS Ketenagakerjaan dalam 2×24 jam (KK3/KK4), (5) Investigasi kecelakaan — identifikasi akar masalah, (6) Tindakan korektif dan pencegahan. Semua kecelakaan kerja WAJIB dilaporkan. Pekerja yang terdaftar BPJS TK: dapat santunan JKK (Jaminan Kecelakaan Kerja).`,
    perancah: `Scaffolding/Perancah di Indonesia: wajib sesuai SNI 7557:2011. Jenis: (1) Perancah pipa besi sistem kwikstage/ringlock — paling umum, (2) Perancah kayu — untuk proyek kecil. Standar keamanan: jarak maksimal tiang vertikal 2.4m, horizontal 1.8m, papan kerja lebar minimal 40cm, pengaman pinggir (guardrail) ketinggian 1m, papan sabut (toeboard) minimal 15cm. Beban kerja maksimal per frame: 150kg. Inspeksi scaffolding sebelum digunakan dan setelah hujan lebat. Pasang safety net pada ketinggian >4m.`,
    k3_konstruksi: `Sistem manajemen K3 konstruksi mengacu pada: (1) UU No. 1/1970 — Keselamatan Kerja, (2) PP No. 50/2012 — SMK3 (Sistem Manajemen K3), (3) Permenaker No. 1/1980 — K3 Konstruksi Bangunan, (4) Permenaker No. 8/2010 — APD. Proyek konstruksi >100 orang pekerja atau nilai kontrak >100 juta: wajib ada Ahli K3 bersertifikat. Program K3 wajib: safety induction untuk pekerja baru, safety talk mingguan, hazard identification (HIRARC), JSA (Job Safety Analysis) untuk pekerjaan berisiko tinggi.`,
};
const MANAJEMEN_KB = {
    rab: `RAB (Rencana Anggaran Biaya) disusun berdasarkan AHSP (Analisa Harga Satuan Pekerjaan). Komponen: (1) Volume pekerjaan dari gambar kerja (BQ/BoQ), (2) Harga satuan pekerjaan = material + upah + alat + overhead (10-15%) + profit (5-10%), (3) Referensi harga: HSPK Daerah setempat atau SE Dirjen Bina Konstruksi No. 30/2025. Contingency budget 5-10% untuk proyek swasta, 5% untuk proyek pemerintah. Software RAB: MS Excel, BIM 5D, atau aplikasi khusus RAB seperti Estiman/HSPK.id.`,
    schedule: `Jadwal Pelaksanaan Proyek (Master Schedule) dibuat dengan metode: (1) Bar Chart/Gantt Chart — untuk proyek sederhana, (2) Network Planning (CPM/PERT) — untuk proyek kompleks. Perhatikan: critical path (lintasan kritis), milestone proyek, resource leveling (perataan sumber daya). Software: MS Project, Primavera P6, atau manual di Excel. Kurva-S dibuat dari schedule untuk monitoring progres. Keterlambatan >10% dari jadwal: wajib laporan recovery schedule ke owner. Denda keterlambatan kontrak pemerintah: 1/1000 per hari maksimal 5% nilai kontrak.`,
    kontrak: `Kontrak konstruksi di Indonesia: (1) Kontrak Lump Sum: nilai tetap, volume pasti dari BoQ — cocok untuk proyek dengan gambar lengkap, (2) Kontrak Unit Price/Harga Satuan: bayar per item aktual — cocok untuk proyek dengan volume belum pasti, (3) Cost + Fee: biaya aktual + fee — untuk proyek darurat/kompleks. Kontrak pemerintah: mengacu Perpres 16/2018 jo. Perpres 12/2021 tentang Pengadaan Barang/Jasa. Kontrak harus mencakup: ruang lingkup, harga, jadwal, cara pembayaran, denda/bonus, force majeure, penyelesaian sengketa.`,
    metode_cor: `Metode pengecoran beton di lapangan: (1) Cor manual (molen + gerobak): untuk volume kecil <5m³, (2) Cor readymix + pompa beton: efisien untuk volume besar, harga readymix Rp 1.1-1.5 jt/m³, (3) Precast: untuk elemen berulang (kolom, balok, plat). Tahapan: bekisting → pembesian → cor → curing. Jangan cor saat hujan, kecuali ada pelindung. Slump test wajib tiap truck readymix. Buat benda uji silinder 15×30cm: tes kuat tekan hari ke-7 dan ke-28. Konsolidasi dengan vibrator setiap 30-45cm lapisan.`,
    manajemen_proyek: `Manajemen Proyek Konstruksi menggunakan pendekatan: (1) Scope — ruang lingkup jelas dalam dokumen kontrak dan gambar, (2) Time — master schedule dengan milestones, (3) Cost — RAB, cash flow, dan monitoring biaya aktual vs budget, (4) Quality — RKS (Rencana Kerja dan Syarat), inspection checklist, (5) Risk — daftar risiko dan mitigasi, (6) Communication — weekly progress report, rapat koordinasi mingguan, (7) Procurement — pengadaan material dan subkon tepat waktu. Sistem Informasi: laporan harian/mingguan mandor, foto progres, dan log site.`,
};
const MATERIAL_KB = {
    semen: `Semen di Indonesia: (1) OPC (Ordinary Portland Cement) — serbaguna, paling umum (Tiga Roda, Holcim, Gresik, Padang, Bosowa, Dynamix), (2) PPC (Portland Pozzolan Cement) — lebih tahan sulfat, cocok untuk pekerjaan laut/lembab, (3) PCC (Portland Composite Cement) — ekonomis, untuk bangunan non-struktur. Untuk pekerjaan struktur: minimal semen OPC. Kebutuhan semen per m³ beton K-225: ±300-350kg. Simpan semen di tempat kering, rak kayu, tumpuk maksimal 10 sak. Semen kadaluarsa (>3 bulan atau menggumpal): jangan digunakan.`,
    pasir: `Pasir bangunan: (1) Pasir halus (pasir pasang/bata): fineness modulus 1.5-2.5, untuk adukan plester, acian, dan pasangan bata, (2) Pasir kasar (pasir cor): FM 2.5-3.5, untuk campuran beton, (3) Pasir abu batu: abu batu/stone dust, untuk campuran aspal atau beton. Pasir harus bersih dari lumpur (<5%), organik, dan garam. Uji mudah: celup ke air — kalau air keruh coklat, pasir banyak lumpurnya. Pasir sungai umumnya lebih bersih dari pasir laut (hindari pasir laut untuk beton). Kebutuhan pasir per m³ beton K-225: ±640-680 kg.`,
    keramik: `Spesifikasi keramik: (1) Keramik lantai: ketebalan 8-10mm, kuat tekan >1000N, skid resistance R9-R11 untuk area basah, (2) Keramik dinding: 6-8mm, (3) Granit tile: keras dan tahan goresan, untuk area premium. Standar SNI 03-2094-2000. Pemilihan: area outdoor/kamar mandi — pilih coeff friction >0.6 (R10+), area kering — bebas pilih. Spasi nat keramik: 2-3mm untuk plester adi, 3-5mm untuk setting biasa. Perekat keramik: AM adhesive atau semen khusus keramik lebih baik dari adukan semen biasa. Ekspansi joint wajib tiap 4-5m untuk area luas.`,
    bata_merah: `Bata merah SNI 15-2094-2000: ukuran standar 240×115×52mm. Jenis: (1) Bata merah biasa — kuat tekan 25-100 kg/cm², (2) Bata press — lebih presisi dan kuat, (3) Bata roster — untuk ventilasi dekoratif. Kebutuhan per m² pasangan: ±70 bata. Campuran adukan bata: 1:4 (semen:pasir) untuk pasangan biasa, 1:2-1:3 untuk area terkena air. Alternatif bata: (1) Hebel/bata ringan AAC (autoclaved aerated concrete) — lebih ringan, insulasi baik, pemotongan mudah, harga lebih mahal, (2) Batako — lebih murah, kedap suara cukup baik.`,
    waterproofing: `Sistem waterproofing: (1) Coating (membran cair): Sika, Fosroc, MasterSeal — aplikasi 2 lapis, untuk dak/atap/KM. (2) Membrane sheet: lembaran bitumen/HDPE — untuk basement, kolam renang. (3) Injection grout: untuk retak aktif pada struktur beton. (4) Crystalline: Xypex/Sika WT — dicampur beton atau aplikasi ke permukaan, tumbuh di dalam beton. Persiapan substrat penting: bersih, bebas debu, lembab tapi tidak menggenang. Test rendam 48 jam setelah aplikasi selesai. Garansi waterproofing umumnya 5 tahun untuk aplikator bersertifikat.`,
};
// ─── Agent Definitions ────────────────────────────────────────────────────────
const AGENTS = [
    { id: "struktur", name: "Agen Struktur", domain: "Struktur & Sipil", icon: "🏗️", emoji: "🏗️", description: "Pondasi, kolom, balok, plat lantai, beton, baja, retak", keywords: ["pondasi", "kolom", "balok", "plat", "beton", "besi", "struktur", "retak", "tulangan", "cor", "footplat", "pile", "strauss", "fondasi", "slab", "sloof"], kb: STRUKTUR_KB },
    { id: "arsitektur", name: "Agen Arsitektur", domain: "Arsitektur & Perizinan", icon: "📐", emoji: "📐", description: "Desain, denah, IMB/PBG, KDB, KLB, atap, cat", keywords: ["imb", "pbg", "izin", "denah", "atap", "dinding", "cat", "desain", "warna", "arsitektur", "kdb", "klb", "gsb", "slf", "genteng", "fasad", "ruang"], kb: ARSITEKTUR_KB },
    { id: "mep", name: "Agen MEP", domain: "Mekanikal Elektrikal Plambing", icon: "⚡", emoji: "⚡", description: "Listrik, air bersih, sanitasi, HVAC, pompa", keywords: ["listrik", "plambing", "air", "pompa", "ac", "hvac", "pipa", "kabel", "mcb", "saklar", "stop kontak", "septic", "drainase", "sanitasi", "instalasi", "grounding", "elcb"], kb: MEP_KB },
    { id: "k3", name: "Agen K3", domain: "Keselamatan Kerja", icon: "⛑️", emoji: "⛑️", description: "APD, keselamatan, scaffolding, prosedur darurat", keywords: ["k3", "keselamatan", "apd", "helm", "scaffolding", "perancah", "kecelakaan", "bpjs", "harness", "safety", "risk", "bahaya", "hseo", "ahli k3", "inciden"], kb: K3_KB },
    { id: "manajemen", name: "Agen Manajemen Proyek", domain: "Manajemen & Kontrak", icon: "📊", emoji: "📊", description: "RAB, schedule, kontrak, metode pelaksanaan, laporan", keywords: ["rab", "schedule", "kontrak", "anggaran", "biaya", "manajemen", "proyek", "gantt", "milestone", "pengadaan", "tender", "laporan", "hspk", "ahsp", "kurva s", "progress"], kb: MANAJEMEN_KB },
    { id: "material", name: "Agen Material", domain: "Material & Spesifikasi", icon: "🧱", emoji: "🧱", description: "Semen, pasir, besi, keramik, bata, waterproofing, SNI", keywords: ["semen", "pasir", "keramik", "bata", "hebel", "waterproofing", "cat", "material", "spesifikasi", "sni", "bahan", "granit", "genteng", "rangka", "profil", "besi", "baja"], kb: MATERIAL_KB },
];
// ─── Orchestrator: Route + Answer ────────────────────────────────────────────
function detectDomains(question) {
    const q = question.toLowerCase();
    const matched = [];
    for (const agent of AGENTS) {
        const score = agent.keywords.filter(k => q.includes(k)).length;
        if (score > 0)
            matched.push(agent.id);
    }
    // Fallback: answer with all agents if no match
    return matched.length > 0 ? matched : AGENTS.map(a => a.id);
}
function searchKB(kb, question) {
    const q = question.toLowerCase();
    for (const [key, answer] of Object.entries(kb)) {
        if (q.includes(key) || key.split("_").some(k => q.includes(k))) {
            return answer;
        }
    }
    // Find best partial match
    let best = null;
    let bestScore = 0;
    for (const [key, answer] of Object.entries(kb)) {
        const score = key.split("_").filter(k => q.includes(k)).length + (q.includes(key) ? 2 : 0);
        if (score > bestScore) {
            bestScore = score;
            best = answer;
        }
    }
    return bestScore > 0 ? best : null;
}
function generateContextualAnswer(agent, question) {
    const kbMatch = searchKB(agent.kb, question);
    let answer;
    if (kbMatch) {
        answer = kbMatch;
    }
    else {
        answer = `Berdasarkan domain ${agent.domain}, pertanyaan Anda berkaitan dengan area spesialisasi saya. Namun untuk pertanyaan yang lebih spesifik, saya memerlukan detail tambahan seperti: dimensi bangunan, lokasi proyek, jenis tanah, dan kondisi lapangan. Silakan berikan informasi lebih lengkap agar saya dapat memberikan rekomendasi teknis yang lebih akurat sesuai SNI dan standar konstruksi Indonesia yang berlaku.`;
    }
    return {
        agentId: agent.id,
        agentName: agent.name,
        domain: agent.domain,
        answer,
        confidence: kbMatch ? 0.85 + Math.random() * 0.12 : 0.55 + Math.random() * 0.2,
        references: getReferences(agent.id, question),
    };
}
function getReferences(agentId, question) {
    const refs = {
        struktur: ["SNI 2847:2019 — Persyaratan Beton Struktural untuk Bangunan Gedung", "SNI 1726:2019 — Tata Cara Perencanaan Ketahanan Gempa", "SNI 8460:2017 — Persyaratan Perancangan Geoteknik", "PBI 1971 — Peraturan Beton Bertulang Indonesia"],
        arsitektur: ["PP 16/2021 — Peraturan Pelaksanaan UU Bangunan Gedung", "SNI 03-2847-2002 — Tata Cara Perhitungan Struktur Beton", "Permen PUPR No. 14/2017 — Persyaratan Kemudahan Bangunan Gedung", "RDTR/RTRW Kabupaten/Kota setempat"],
        mep: ["PUIL 2011 (SNI 0225:2011) — Persyaratan Umum Instalasi Listrik", "SNI 2398:2017 — Tata Cara Perencanaan Tangki Septik", "Permen PU No. 24/2007 — Pedoman Teknis IMB", "SNI 8153:2015 — Sistem Plambing pada Bangunan Gedung"],
        k3: ["UU No. 1/1970 — Keselamatan Kerja", "Permenaker No. 1/1980 — K3 pada Konstruksi Bangunan", "PP 50/2012 — Sistem Manajemen K3", "SNI 7557:2011 — Perancah Pipa Logam"],
        manajemen: ["Perpres 16/2018 jo. 12/2021 — Pengadaan Barang/Jasa Pemerintah", "SE Dirjen Bina Konstruksi No. 30/2025 — AHSP Konstruksi", "PMBOK Guide 7th Edition — Project Management Body of Knowledge", "SNI ISO 21500:2012 — Pedoman Manajemen Proyek"],
        material: ["SNI 15-2094-2000 — Bata Merah Pejal untuk Pasangan Dinding", "SNI 03-2094-2000 — Ubin Keramik", "SNI 2049:2015 — Semen Portland", "SNI 2052:2017 — Baja Tulangan Beton"],
    };
    return refs[agentId] || [];
}
export function orchestrateAnswer(question) {
    const domains = detectDomains(question);
    const agents = AGENTS.filter(a => domains.includes(a.id));
    const responses = agents.map(a => generateContextualAnswer(a, question));
    responses.sort((a, b) => b.confidence - a.confidence);
    const primary = responses[0];
    const supporting = responses.slice(1, 3);
    return {
        question,
        primaryAnswer: primary,
        supportingAnswers: supporting,
        relatedQuestions: generateRelated(question, primary.agentId),
        timestamp: new Date().toISOString(),
    };
}
function generateRelated(question, primaryAgent) {
    const pool = {
        struktur: [
            "Berapa jarak sengkang kolom di zona gempa?",
            "Apa syarat mutu beton untuk kolom struktur?",
            "Bagaimana cara mendeteksi retak struktural vs non-struktural?",
            "Berapa kedalaman ideal pondasi untuk rumah 2 lantai?",
            "Apa perbedaan besi polos dan besi ulir untuk tulangan?",
        ],
        arsitektur: [
            "Berapa nilai KDB maksimal untuk zona perumahan?",
            "Dokumen apa saja yang diperlukan untuk PBG?",
            "Bagaimana syarat kemiringan atap untuk genteng beton?",
            "Apa perbedaan IMB dan PBG dalam regulasi terbaru?",
        ],
        mep: [
            "Berapa ukuran pipa air bersih yang ideal untuk rumah 2 lantai?",
            "Apa standar jarak septic tank dari sumur?",
            "Kapasitas AC yang tepat untuk ruang 4×4 meter?",
            "Bagaimana menghitung kebutuhan daya listrik rumah?",
        ],
        k3: [
            "APD apa yang wajib digunakan saat pekerjaan di ketinggian?",
            "Bagaimana prosedur kecelakaan kerja di proyek?",
            "Standar scaffolding yang aman untuk bangunan 3 lantai?",
        ],
        manajemen: [
            "Bagaimana cara menyusun RAB yang akurat?",
            "Apa perbedaan kontrak lump sum dan unit price?",
            "Bagaimana menghitung progres pekerjaan untuk kurva-S?",
            "Dokumen apa yang harus ada di setiap proyek konstruksi?",
        ],
        material: [
            "Berapa campuran semen:pasir:kerikil yang benar untuk K-225?",
            "Apa beda semen OPC, PCC, dan PPC?",
            "Produk waterproofing terbaik untuk dak beton bocor?",
            "Bagaimana memilih keramik yang anti-slip untuk kamar mandi?",
        ],
    };
    return (pool[primaryAgent] || pool.struktur).slice(0, 4);
}
// ─── Seeded Q&A Data (Community Forum) ───────────────────────────────────────
export const SEEDED_QUESTIONS = [
    {
        id: "q1", title: "Berapa ketebalan plat lantai yang ideal untuk rumah 2 lantai?", body: "Saya mau bangun rumah 2 lantai dengan bentang antar kolom 4 meter. Berapa tebal plat lantai beton yang direkomendasikan dan berapa diameter tulangannya?", category: "Struktur", tags: ["plat lantai", "beton", "struktur"], askedBy: "Budi Santoso", role: "Pelanggan", answered: true, views: 342, upvotes: 28,
        answers: [
            { id: "a1", body: "Untuk bentang 4 meter, ketebalan plat lantai yang direkomendasikan adalah **12-15 cm**. Jika ada beban berat (mesin, banyak orang), gunakan 15 cm. Tulangan: **Ø10-150** dua arah (atas dan bawah). Mutu beton minimal **K-225 (fc'=19MPa)**. Selimut beton 20 mm. Jangan lupa pasang wiremesh atau besi tulangan secara presisi sebelum dicor. Referensi: SNI 2847:2019 Pasal 8.", agentId: "struktur", agentName: "Agen Struktur", isAI: true, upvotes: 24 },
            { id: "a1b", body: "Tambahan dari sisi pelaksanaan: pastikan bekisting cukup kuat dan propping/perancah dipasang di bawah bekisting minimal setiap 1.2m. Jangan lepas bekisting sebelum beton berumur 21 hari atau minimal kuat tekan sudah 70% dari target. Curing wajib 7 hari pertama.", agentId: "manajemen", agentName: "Agen Manajemen", isAI: true, upvotes: 11 },
        ],
    },
    {
        id: "q2", title: "Cara menghitung kebutuhan semen untuk plesteran 100m²", body: "Saya mau plester dinding rumah total 100m² dengan campuran 1:4. Berapa sak semen dan berapa pasir yang dibutuhkan?", category: "Material", tags: ["semen", "plesteran", "estimasi"], askedBy: "Ahmad Fauzi", role: "Tukang Batu", answered: true, views: 511, upvotes: 45,
        answers: [
            { id: "a2", body: "Untuk plesteran 100m² ketebalan 15mm dengan campuran 1:4 (semen:pasir):\n\n**Volume adukan** = 100 × 0.015 = 1.5 m³ (basah)\nKarena ada penyusutan, kebutuhan material kering ±1.75 m³\n\n**Kebutuhan semen**: ±280 kg = **±6 sak semen** @50kg\n**Kebutuhan pasir**: ±1.1 m³ (±1,100 kg atau ±4.4 truk gerobak)\n\nTips: gunakan pasir halus bersih dengan FM 1.5-2.5. Tebal plester ideal 10-15mm, jangan lebih dari 20mm sekali aplikasi karena bisa retak saat kering.", agentId: "material", agentName: "Agen Material", isAI: true, upvotes: 38 },
        ],
    },
    {
        id: "q3", title: "Pondasi yang tepat untuk tanah bekas sawah di Bekasi?", body: "Saya mau bangun rumah di kavling bekas sawah di Bekasi. Tanah masih cukup lembek. Rencana bangun rumah 2 lantai. Pondasi apa yang disarankan?", category: "Struktur", tags: ["pondasi", "tanah lembek", "rumah 2 lantai"], askedBy: "Rina Kusuma", role: "Pelanggan", answered: true, views: 677, upvotes: 52,
        answers: [
            { id: "a3", body: "Untuk tanah bekas sawah (lembek/gambut), pondasi batu kali TIDAK direkomendasikan karena daya dukung tanah rendah. Pilihan terbaik:\n\n1. **Pondasi Strauss Pile** Ø250mm kedalaman 5-8m — ekonomis, bisa manual, cocok untuk rumah 2 lantai\n2. **Pondasi Mini Pile** (precast concrete 20×20cm atau 25×25cm) — lebih kuat, untuk beban lebih besar\n3. **Pondasi Tiang Pancang** — untuk beban berat/3 lantai+\n\nWajib lakukan **uji sondir/SPT** terlebih dahulu untuk mengetahui kedalaman tanah keras. Di Bekasi, tanah keras (qc>150 kg/cm²) biasanya di kedalaman 5-12m. Biaya strauss pile: ±Rp 300-500rb/titik.", agentId: "struktur", agentName: "Agen Struktur", isAI: true, upvotes: 47 },
        ],
    },
    {
        id: "q4", title: "Langkah-langkah pengajuan PBG (pengganti IMB) online?", body: "Saya mau bangun rumah baru dan bingung prosedur PBG yang baru. Dokumen apa saja yang dibutuhkan dan bagaimana cara daftarnya?", category: "Regulasi", tags: ["PBG", "IMB", "perizinan", "SIMBG"], askedBy: "Dian Pratama", role: "Pelanggan", answered: true, views: 893, upvotes: 71,
        answers: [
            { id: "a4", body: "Prosedur PBG (Persetujuan Bangunan Gedung) sesuai PP 16/2021:\n\n**Dokumen yang diperlukan:**\n- Bukti kepemilikan tanah (SHM/HGB/SHGB)\n- KTP pemohon\n- Gambar rencana arsitektur (site plan, denah, tampak, potongan)\n- Gambar rencana struktur (pondasi, kolom, balok, plat)\n- Gambar rencana MEP (listrik, plambing)\n- Perhitungan struktur\n- Dokumen AMDAL (jika diperlukan)\n\n**Cara daftar online:**\n1. Akses **SIMBG** di simbg.pu.go.id atau aplikasi Pemda setempat\n2. Buat akun, isi data pemohon\n3. Upload semua dokumen\n4. Tunggu verifikasi 3-14 hari kerja\n5. PBG terbit dalam 28 hari (max) setelah dokumen lengkap\n\nSetelah bangunan selesai: ajukan **SLF (Sertifikat Laik Fungsi)**.", agentId: "arsitektur", agentName: "Agen Arsitektur", isAI: true, upvotes: 63 },
        ],
    },
    {
        id: "q5", title: "Berapa kapasitas AC yang tepat untuk ruang kerja 5×6 meter?", body: "Saya punya ruang kantor 5×6 meter dengan plafon 3 meter. Berisi 4 komputer dan 5 orang. AC berapa PK yang tepat?", category: "MEP", tags: ["AC", "HVAC", "kapasitas", "BTU"], askedBy: "Rendi Wahyudi", role: "Pelanggan", answered: true, views: 428, upvotes: 33,
        answers: [
            { id: "a5", body: "Perhitungan kapasitas AC untuk ruang kantor 5×6m (30m²):\n\n**Rumus dasar**: 500-600 BTU/jam per m²\n= 30 × 550 = **16.500 BTU/jam**\n\nFaktor koreksi:\n- Ruang menghadap barat (tambah 10%): +1.650 BTU\n- 5 penghuni + 4 komputer (tambah 600 BTU/orang+perangkat): +5.400 BTU\n\n**Total**: ±23.000 BTU ≈ **2.5 PK**\n\nRekomendasi: pasang **1 unit AC 2.5 PK** atau **2 unit 1.5 PK** (lebih efisien distribusi udara). Brand terpercaya: Daikin, Panasonic, Mitsubishi Electric, LG. Pastikan ada drain pipa pembuangan air kondensasi ke luar.", agentId: "mep", agentName: "Agen MEP", isAI: true, upvotes: 29 },
        ],
    },
    {
        id: "q6", title: "Cara menyusun RAB sederhana untuk renovasi kamar mandi", body: "Saya mau renovasi kamar mandi ukuran 2×1.5 meter: ganti keramik, ganti kloset, perbaiki instalasi air. Bagaimana cara buat RAB yang benar?", category: "Manajemen", tags: ["RAB", "renovasi", "kamar mandi", "estimasi biaya"], askedBy: "Susi Rahayu", role: "Pelanggan", answered: true, views: 744, upvotes: 62,
        answers: [
            { id: "a6", body: "Contoh RAB renovasi KM 2×1.5m:\n\n| No | Uraian Pekerjaan | Volume | Sat | Harga Sat | Jumlah |\n|---|---|---|---|---|---|\n| 1 | Bongkar keramik lama | 3 m² | m² | Rp 45.000 | Rp 135.000 |\n| 2 | Pasang keramik baru (dinding) | 10 m² | m² | Rp 130.000 | Rp 1.300.000 |\n| 3 | Pasang keramik lantai | 3 m² | m² | Rp 120.000 | Rp 360.000 |\n| 4 | Ganti kloset duduk | 1 set | set | Rp 850.000 | Rp 850.000 |\n| 5 | Perbaikan instalasi pipa | 1 ls | ls | Rp 500.000 | Rp 500.000 |\n| 6 | Cat dinding | 1 ls | ls | Rp 200.000 | Rp 200.000 |\n| | **Sub Total Jasa** | | | | **Rp 3.345.000** |\n| | Material (keramik, nat, dll) | | | | ≈ Rp 1.200.000 |\n| | **Total Keseluruhan** | | | | **≈ Rp 4.545.000** |\n\nCatatan: harga satuan jasa sesuai upah daerah. Material ditambah sendiri atau nego all-in dengan tukang.", agentId: "manajemen", agentName: "Agen Manajemen", isAI: true, upvotes: 58 },
        ],
    },
    {
        id: "q7", title: "APD wajib apa saja untuk pekerja di ketinggian >4 meter?", body: "Tim saya akan mengerjakan pemasangan rangka atap baja ringan di ketinggian 4-6 meter. APD apa saja yang wajib digunakan sesuai regulasi?", category: "K3", tags: ["APD", "K3", "ketinggian", "atap"], askedBy: "Hartono Mandor", role: "Tukang", answered: true, views: 312, upvotes: 27,
        answers: [
            { id: "a7", body: "Untuk pekerjaan di ketinggian 4-6 meter, APD WAJIB sesuai Permenaker No. 8/2010 dan PP 50/2012:\n\n✅ **Wajib Mutlak:**\n- Harness full-body (ANSI Z359 atau SNI setara) + lanyard dengan shock absorber\n- Helm proyek SNI 1811:2007 dengan chin strap\n- Sepatu safety (steel toe + anti-slip)\n- Rompi keselamatan (hi-vis)\n\n✅ **Sangat Dianjurkan:**\n- Sarung tangan kerja anti-slip\n- Kacamata safety\n- Lifeline (tali pengaman horizontal) di sepanjang area kerja\n\n❌ **Larangan:**\n- Bekerja tanpa harness di atas 2 meter\n- Menggunakan sandal/alas kaki biasa\n- Tidak ada anchorage point yang kuat\n\nAnchorage point harness harus kuat menahan beban 2.250 kg. Lakukan JSA (Job Safety Analysis) sebelum mulai pekerjaan.", agentId: "k3", agentName: "Agen K3", isAI: true, upvotes: 24 },
        ],
    },
    {
        id: "q8", title: "Perbedaan bata merah vs hebel/bata ringan — mana yang lebih baik?", body: "Saya mau bangun tembok rumah 1 lantai. Disarankan pakai bata merah biasa atau bata ringan (hebel)? Mana yang lebih bagus dari sisi kekuatan, harga, dan pemasangan?", category: "Material", tags: ["bata merah", "hebel", "bata ringan", "dinding"], askedBy: "Kurnia Wijaya", role: "Pelanggan", answered: true, views: 983, upvotes: 87,
        answers: [
            { id: "a8", body: "**Perbandingan Bata Merah vs Bata Ringan (Hebel/AAC):**\n\n| Aspek | Bata Merah | Bata Ringan (Hebel) |\n|---|---|---|\n| Harga | Rp 700-1.200/biji | Rp 8.000-12.000/biji |\n| Kekuatan | 25-100 kg/cm² | 40-65 kg/cm² |\n| Berat | Berat (~1.6 ton/m³) | Ringan (~0.65 ton/m³) |\n| Insulasi panas | Cukup | Lebih baik (pori-pori udara) |\n| Insulasi suara | Cukup | Lebih baik |\n| Ketahanan gempa | Cukup | Lebih baik (ringan) |\n| Kemudahan pasang | Standar | Lebih cepat (~3-4× lebih cepat) |\n| Adukan | Semen:pasir 1:4 | Khusus thin bed mortar |\n| Rayap | Tidak cocok (tanah) | Tahan rayap |\n| Retak rambut | Lebih sering | Lebih jarang (jika pasang benar) |\n\n**Rekomendasi**: untuk rumah tinggal, bata ringan lebih efisien waktu dan tenaga. Bata merah lebih cocok untuk yang terbiasa dan budget lebih terbatas.", agentId: "material", agentName: "Agen Material", isAI: true, upvotes: 79 },
        ],
    },
];
