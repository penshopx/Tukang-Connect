import { useState } from "react";
import { BookOpen, Search, Clock, ChevronRight, CheckCircle2, Lock, Star, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ELECTRICAL_MATERIALS } from "@/data/electricalMaterials";
import type { Material } from "@/types/studyMaterial";

const CORE_MATERIALS: Material[] = [
  {
    id: 1, title: "Manajemen K3 Konstruksi Gedung Bertingkat",
    level: "Level 5 - Kepala Pelaksana", category: "K3", duration: "45 menit", difficulty: "Sulit",
    description: "Materi persiapan uji kompetensi K3 untuk proyek konstruksi gedung bertingkat.",
    topics: ["Identifikasi Bahaya", "Analisis Risiko IBPR", "Pengendalian Hierarki K3", "Dokumen JSA & Izin Kerja"],
    content: `# K3 Konstruksi Gedung Bertingkat\n\n## 1. Identifikasi Bahaya (Hazard Identification)\nSetiap tahap pekerjaan memiliki potensi bahaya yang berbeda:\n- **Galian & Pondasi:** Longsoran tanah, paparan bahan kimia tanah\n- **Struktur:** Jatuh dari ketinggian, tertimpa material\n- **MEP:** Sengatan listrik, kebocoran gas\n- **Finishing:** Paparan debu, bahan kimia cat\n\n## 2. Penilaian Risiko (Risk Assessment)\nMatriks risiko: Kemungkinan × Dampak\n- **Risiko Tinggi (>15):** Hentikan pekerjaan, perbaiki kontrol\n- **Risiko Sedang (8-15):** Terapkan kontrol tambahan\n- **Risiko Rendah (<8):** Prosedur normal\n\n## 3. Hierarki Pengendalian Risiko\n1. Eliminasi — hilangkan sumber bahaya\n2. Substitusi — ganti material/proses berbahaya\n3. Rekayasa teknis — isolasi, pelindung mesin\n4. Administratif — prosedur, pelatihan, rotasi kerja\n5. APD — helm, sepatu safety, harness\n\n## 4. Dokumen K3 Wajib\n- IBPR (Identifikasi Bahaya & Penilaian Risiko)\n- JSA (Job Safety Analysis) per aktivitas\n- Izin kerja khusus: hot work, elevated, confined space\n- MSDS untuk bahan kimia\n\n## Tips Ujian BNSP\n- Hafal hierarki pengendalian (Eliminasi → APD)\n- Pahami perbedaan IBPR vs JSA\n- Pelajari PP 50/2012 tentang SMK3`,
  },
  {
    id: 2, title: "Teknik Pembesian & Pengecoran Beton",
    level: "Level 3 - Teknisi/Analis Madya", category: "Struktur", duration: "35 menit", difficulty: "Menengah",
    description: "Panduan lengkap teknik pembesian dan pengecoran beton sesuai standar SNI 2847.",
    topics: ["Mutu & Diameter Besi", "Cover Beton (Selimut)", "Teknik Pengecoran", "Curing Beton"],
    content: `# Teknik Pembesian & Pengecoran Beton\n\n## 1. Mutu Baja Tulangan (SNI 2052)\n- **BJTP 24 (fy=240 MPa):** Besi polos, untuk sengkang & konstruksi ringan\n- **BJTD 40 (fy=390 MPa):** Besi ulir, untuk tulangan utama\n\n**Diameter umum:**\n| Diameter | Kegunaan |\n|----------|----------|\n| D8-D10 | Sengkang/begel |\n| D12-D16 | Tulangan plat, kolom kecil |\n| D19-D25 | Balok, kolom sedang |\n| D29-D32 | Kolom besar, pile cap |\n\n## 2. Cover Beton (Selimut Beton)\nJarak minimum tulangan ke permukaan beton:\n- Kolom: 40mm\n- Balok: 40mm\n- Plat lantai: 20mm\n- Pondasi di tanah: 75mm\n- Beton yang terkena air laut: 75mm\n\n## 3. Teknik Pengecoran\n**Persiapan:**\n- Bersihkan bekisting dari kotoran & serbuk gergaji\n- Basahi bekisting sebelum cor\n- Cek ulang posisi dan jarak tulangan\n\n**Pengecoran:**\n- Tinggi jatuh beton maks 1,5m (hindari segregasi)\n- Vibrator setiap 30-50cm\n- Jangan tambah air di lapangan!\n\n**Slump Test:**\n- Kolom & balok: 7,5-15cm\n- Plat lantai: 7,5-12,5cm\n\n## 4. Curing Beton\n- Curing minimum 7 hari untuk mencapai 70% kekuatan\n- Curing 28 hari untuk kekuatan penuh\n- Metode: tutup karung basah, semprot air, compound curing`,
  },
  {
    id: 3, title: "Pengawasan Pekerjaan Pengecatan Bangunan",
    level: "Level 4 - Supervisor", category: "Finishing", duration: "25 menit", difficulty: "Mudah",
    description: "Standar pengawasan kualitas pekerjaan pengecatan dinding interior dan eksterior.",
    topics: ["Persiapan Permukaan", "Jenis & Spesifikasi Cat", "Teknik Aplikasi", "Quality Control"],
    content: `# Pengawasan Pekerjaan Pengecatan\n\n## 1. Persiapan Permukaan (Wajib!)\nKegagalan cat 80% disebabkan persiapan permukaan yang buruk:\n- Pastikan plesteran sudah kering minimal 28 hari\n- Bersihkan debu, lemak, dan kotoran\n- Tambal lubang & retak dengan dempul/plamir\n- Amplas hingga rata, bersihkan debu amplas\n- Cek kadar air dinding: maks 20% (moisture meter)\n\n## 2. Spesifikasi Cat\n**Interior:**\n- Cat emulsi berbasis air (water-based)\n- Merk: Dulux Pentalite, Jotun Majestic, Mowilex Interior\n- Spreading rate: 10-12 m²/liter/lapis\n\n**Eksterior:**\n- Wajib anti-jamur, anti-alkali, tahan cuaca\n- Merk: Dulux Weathershield, Mowilex Weathercoat\n- Bersertifikat SNI\n\n## 3. Teknik Aplikasi yang Benar\n**Urutan:**\n1. Cat dasar/primer (1 lapis)\n2. Tunggu kering 4-6 jam\n3. Cat finish lapisan 1\n4. Tunggu kering 4-6 jam\n5. Cat finish lapisan 2\n\n**Kuas vs Roller:**\n- Kuas: sudut, list, area sempit\n- Roller: bidang luas, lebih cepat\n- Roller bulu 12-18mm untuk permukaan kasar\n\n## 4. Quality Control\n- Cek ketebalan cat basah dengan wet film gauge\n- Lakukan cross-cut test untuk adhesion\n- Dokumentasi per area dengan foto\n- Reject: alligator crack, dripping, warna belang`,
  },
  {
    id: 4, title: "Instalasi Listrik Bangunan Hunian (PUIL 2011)",
    level: "Level 4 - Supervisor", category: "Elektrikal", duration: "40 menit", difficulty: "Menengah",
    description: "Standar instalasi listrik bangunan hunian sesuai Persyaratan Umum Instalasi Listrik (PUIL) 2011.",
    topics: ["PUIL 2011 Overview", "Sistem Pengkabelan", "Panel & Proteksi", "Testing & Commissioning"],
    content: `# Instalasi Listrik — PUIL 2011\n\n## 1. Persyaratan Umum (PUIL 2011)\n- Instalasi harus dikerjakan oleh INSTALATIR berlisensi\n- Wajib menggunakan material berlabel SNI\n- Sambungan harus di dalam kotak sambung (junction box)\n- Kabel harus dilindungi konduit jika di dalam dinding\n\n## 2. Sistem Pengkabelan\n**Jenis kabel:**\n- NYM: 3 atau 4 inti, untuk dinding & langit-langit\n- NYY: untuk dalam tanah, lebih tahan air\n- NYAF: untuk sambungan di panel\n\n**Warna kabel standar:**\n- Merah: fasa R\n- Kuning: fasa S\n- Hitam: fasa T\n- Biru: netral\n- Kuning-hijau: ground/PE\n\n**Luas penampang minimum:**\n- Penerangan: 1,5mm²\n- Stop kontak: 2,5mm²\n- AC/Water heater: 4mm²\n\n## 3. Panel & Proteksi\n- MCB (Miniature Circuit Breaker): proteksi per sirkuit\n- ELCB/RCD: proteksi kebocoran arus ke tanah (30mA)\n- Surge protector: lindungi dari petir\n- Rating MCB disesuaikan dengan kabel\n\n## 4. Testing & Commissioning\n1. Uji insulasi: min 1MΩ antar konduktor\n2. Uji kontinuitas: semua sambungan tersambung\n3. Uji ELCB: trip dalam <30ms pada 30mA\n4. Uji tegangan: 220V ±10%\n5. Dokumen: As-built drawing, test report`,
  },
  {
    id: 5, title: "Pekerjaan Pondasi & Galian Tanah",
    level: "Level 3 - Teknisi/Analis Madya", category: "Struktur", duration: "30 menit", difficulty: "Menengah",
    description: "Teknik pelaksanaan pondasi bangunan dari penggalian hingga pengecoran sesuai gambar kerja.",
    topics: ["Jenis Pondasi", "Penggalian & Pemadatan", "Pemasangan Tulangan", "Pengecoran Pondasi"],
    content: `# Pekerjaan Pondasi\n\n## 1. Jenis Pondasi & Penggunaannya\n**Pondasi Dangkal (≤3m):**\n- Tapak (Pad foundation): beban kolom terpusat\n- Menerus (Strip foundation): dinding panjang\n- Rakit (Raft): tanah lunak, beban merata\n\n**Pondasi Dalam (>3m):**\n- Strauss pile: manual, D20-25cm, s/d 6m\n- Bor pile: mesin, D30-100cm, s/d 30m+\n- Tiang pancang: pabrikasi, beban besar\n\n## 2. Penggalian\n- Lebar galian: dimensi pondasi + 50cm (kerja)\n- Kemiringan galian: 1:0,5 untuk tanah stabil\n- Jangan biarkan galian tergenang air\n- Uji sondir/SPT sebelum memulai\n\n## 3. Pengurukan & Pemadatan\n- Lantai kerja (lean concrete K-100): 5-10cm\n- Urugan pasir: 10cm, dipadatkan\n- Kepadatan: min 95% Standard Proctor\n\n## 4. Bekisting & Tulangan Pondasi\n- Cover beton pondasi: 40-75mm (tergantung kondisi)\n- Sambungan tulangan: lap splice min 40×diameter\n- Kait 135° untuk sengkang kolom di zona gempa\n\n## 5. Pengecoran\n- Beton pondasi min K-225 (fc 19,3 MPa)\n- Curing: tutup goni basah 7-28 hari\n- Stripping bekisting: min 3 hari`,
  },
  {
    id: 6, title: "Manajemen Proyek Konstruksi — Penjadwalan & Pengendalian",
    level: "Level 6 - Ahli Muda", category: "Manajemen", duration: "50 menit", difficulty: "Sulit",
    description: "Teknik penjadwalan proyek dengan metode CPM/Bar Chart dan pengendalian biaya nilai hasil (Earned Value).",
    topics: ["Bar Chart & Network Diagram", "CPM & Float Analysis", "Earned Value (EVM)", "Laporan Progress"],
    content: `# Manajemen Jadwal & Biaya Proyek\n\n## 1. Metode Penjadwalan\n**Bar Chart (Gantt Chart):**\n- Mudah dibaca, umum dipakai\n- Tidak bisa analisis ketergantungan aktivitas\n- Cocok untuk proyek sederhana\n\n**Network Diagram (CPM):**\n- Critical Path Method — temukan jalur kritis\n- Hitung: ES, EF, LS, LF, Total Float\n- **Float = LF - EF = LS - ES**\n- Kegiatan di jalur kritis: Float = 0\n\n## 2. Critical Path Analysis\n**Tahap forward pass (ES & EF):**\n- ES aktivitas pertama = 0\n- ES = maks(EF predecessor)\n- EF = ES + Durasi\n\n**Tahap backward pass (LS & LF):**\n- LF aktivitas terakhir = EF terakhir\n- LF = min(LS successor)\n- LS = LF - Durasi\n\n## 3. Earned Value Management (EVM)\n| Indikator | Rumus | Arti |\n|-----------|-------|------|\n| SV | EV - PV | + = Ahead, - = Behind |\n| CV | EV - AC | + = Under budget |\n| SPI | EV/PV | >1 = Lebih cepat |\n| CPI | EV/AC | >1 = Hemat |\n| EAC | BAC/CPI | Estimasi biaya akhir |\n\n## 4. Laporan Progress Mingguan\nHarus mencakup:\n- % fisik vs target (S-curve)\n- Biaya aktual vs rencana\n- Kendala & risiko\n- Rencana minggu depan`,
    isPremium: true,
  },
  {
    id: 7, title: "Teknik Waterproofing — Lantai & Dinding Basah",
    level: "Level 3 - Teknisi/Analis Madya", category: "Finishing", duration: "30 menit", difficulty: "Menengah",
    description: "Teknik dan material waterproofing untuk kamar mandi, dak beton, kolam renang, dan basement.",
    topics: ["Jenis Material Waterproofing", "Aplikasi Coating", "Membran Bakar", "Uji Kebocoran"],
    content: `# Teknik Waterproofing\n\n## 1. Jenis Material Waterproofing\n**Coating (Lapisan):**\n- Cement-based: Sika 107, Fosroc Brushbond\n- Crystalline: menembus pori beton (self-healing)\n- Polyurethane: fleksibel, untuk area bergerak\n\n**Membran:**\n- Torch-on membrane: bakar dengan gas, tahan 15+ tahun\n- Self-adhesive membrane: untuk area sensitif\n- EPDM sheet: untuk atap datar\n\n## 2. Aplikasi Kamar Mandi\n**Standar minimum:**\n- 2-3 lapis coating\n- Naik ke dinding: min 30cm dari lantai\n- Sudut lantai-dinding: fillet semen 5×5cm\n- Curing 24 jam antar lapis\n\n**Uji rendam:**\n- Tutup saluran, isi air 5cm\n- Tunggu 24-48 jam\n- Cek plafon bawah: tidak boleh ada noda basah\n\n## 3. Dak Beton (Roof Deck)\n**Metode torch-on:**\n1. Bersihkan permukaan, tambal retak\n2. Lapisi primer bitumen\n3. Pasang membran pertama (overlap 10cm)\n4. Pasang membran kedua tegak lurus\n5. Pasang protective screed 3cm\n6. Kemiringan dak: min 1-2%\n\n## 4. Cara Deteksi Kebocoran\n- Flood test 24 jam (dak)\n- Termal kamera (dinding)\n- Sniffer gas tracer (void/rongga)`,
  },
  {
    id: 8, title: "Pembacaan Gambar Kerja (Shop Drawing)",
    level: "Level 4 - Supervisor", category: "Manajemen", duration: "40 menit", difficulty: "Menengah",
    description: "Cara membaca dan memahami gambar arsitektur, struktur, dan MEP untuk pelaksanaan di lapangan.",
    topics: ["Skala & Proyeksi", "Simbol Gambar", "Gambar Struktur", "Koordinasi MEP"],
    content: `# Pembacaan Gambar Kerja\n\n## 1. Jenis Gambar Konstruksi\n**Gambar Arsitektur:**\n- Denah (Plan) — tampak dari atas\n- Tampak (Elevation) — tampak dari samping\n- Potongan (Section) — irisan melintang/memanjang\n- Detail — pembesaran area spesifik\n\n**Gambar Struktur:**\n- Denah pondasi & tulangan\n- Denah kolom & balok per lantai\n- Detail pembesian elemen struktur\n\n**Gambar MEP:**\n- M: Mekanikal (AC, ventilasi)\n- E: Elektrikal (kabel, panel)\n- P: Plumbing (pipa air, drainase)\n\n## 2. Cara Baca Skala\n- 1:100 = 1cm di gambar = 100cm di lapangan\n- 1:50 = 1cm = 50cm (lebih besar, lebih detail)\n- 1:20 = 1cm = 20cm (detail)\n\n**Tips:** Selalu cek notasi dimensi di gambar, jangan hanya ukur fisik kertas!\n\n## 3. Simbol Penting\n| Simbol | Arti |\n|--------|------|\n| ϕ12-200 | Besi D12, jarak 200mm |\n| ∅ | Diameter |\n| c/c | Center to center |\n| t= | Tebal |\n| El.+3.50 | Elevasi 3,5m dari ± 0 |\n\n## 4. Koordinasi Gambar di Lapangan\n- Selalu cek gambar terbaru (revision number)\n- Konsultasi bila ada perbedaan gambar vs lapangan\n- Buat request for information (RFI) bila ada keraguan\n- Dokumentasi as-built drawing setelah selesai`,
  },
  {
    id: 9, title: "Instalasi Sistem Perpipaan & Sanitasi",
    level: "Level 3 - Teknisi/Analis Madya", category: "Mekanikal", duration: "35 menit", difficulty: "Menengah",
    description: "Teknik instalasi sistem air bersih, air kotor, dan sanitasi sesuai SNI 03-7065.",
    topics: ["Sistem Air Bersih", "Sistem Air Kotor", "Standar Kemiringan Pipa", "Testing Plambing"],
    content: `# Instalasi Plambing & Sanitasi\n\n## 1. Sistem Air Bersih\n**Jenis pipa:**\n- PPRC (Polypropylene Random Copolymer): tahan panas, air minum\n- Galvanis: tahan lama tapi bisa berkarat\n- Copper: kualitas tinggi, mahal\n\n**Tekanan sistem:** 0,5-4 bar\n**Kecepatan aliran max:** 3 m/s\n\n**Sistem distribusi:**\n- Gravitasi (tandon atas): lebih murah, tekanan konsisten\n- Pompa booster: tekanan stabil di semua lantai\n\n## 2. Sistem Air Kotor & Buangan\n**Kemiringan pipa (SNI 03-7065):**\n| Diameter | Kemiringan Min |\n|----------|---------------|\n| ≤75mm | 2% (1:50) |\n| 100mm | 2% (1:50) |\n| 150mm | 1% (1:100) |\n| ≥200mm | 0,5% (1:200) |\n\n**Vent pipe (pipa angin):**\n- Wajib di setiap WC/floor drain\n- Mencegah siphon effect & bau\n- Diameter min: sama dengan pipa drainase\n\n## 3. Material & Sambungan\n- PVC AW: sistem gravitasi, air dingin\n- Solvent cement: perekatan pipa PVC\n- Rubber ring joint: sistem bertekanan\n\n## 4. Testing Plambing\n**Uji tekanan hidrostatis:**\n- Tutup semua ujung pipa\n- Isi air, beri tekanan 1,5× tekanan kerja\n- Tahan 30 menit — tidak boleh ada penurunan tekanan`,
  },
  {
    id: 10, title: "Pemasangan Rangka Atap Baja Ringan",
    level: "Level 3 - Teknisi/Analis Madya", category: "Struktur", duration: "30 menit", difficulty: "Menengah",
    description: "Teknik pemasangan rangka atap baja ringan sesuai standar TRUSS dan persyaratan pabrikasi.",
    topics: ["Spesifikasi Baja Ringan", "Sistem Kuda-kuda TRUSS", "Jarak Reng", "Pemasangan Genteng"],
    content: `# Rangka Atap Baja Ringan\n\n## 1. Spesifikasi Material\n**Profil baja ringan:**\n- Hollow: 40×80, 40×40mm\n- C-section (reng, gording)\n- Tebal: 0,75mm – 1,0mm (BMT)\n\n**Baja mutu tinggi:** G550 (fy=550 MPa)\n**Coating:** Zincalume/Galvalume (Al-Zn)\n\n## 2. Sistem Kuda-kuda (TRUSS)\n**Komponen:**\n- Top chord (batas atas)\n- Bottom chord (batas bawah)\n- Web (diagonal penghubung)\n\n**Kemiringan atap:**\n- Genteng tanah/beton: min 30°\n- Metal roof: min 10°\n- Genteng bitumen: min 15°\n\n## 3. Jarak Reng\n| Jenis Genteng | Jarak Reng |\n|---------------|------------|\n| Genteng beton | 33-34cm |\n| Genteng keramik | 30-33cm |\n| Genteng metal | Sesuai spec |\n| Genteng flat | 25-28cm |\n\n## 4. Pemasangan & Keamanan\n- Pasang dari bawah ke atas\n- Sambung dengan self-drilling screw\n- Nok: lapisi dengan sealant\n- Overlap genteng tepi: min 2 lapis\n\n**K3 Atap:**\n- Wajib harness saat ketinggian >1,8m\n- Pasang safety net di bawah area kerja\n- Dilarang pijak genteng langsung — gunakan papan kerja`,
  },
  {
    id: 11, title: "Sertifikasi BNSP — Persiapan Uji Kompetensi",
    level: "Level 2 - Teknisi/Analis", category: "Sertifikasi", duration: "45 menit", difficulty: "Mudah",
    description: "Panduan lengkap persiapan ujian sertifikasi BNSP untuk tenaga konstruksi: skema, metode ujian, dan tips lulus.",
    topics: ["Skema Sertifikasi KKNI", "Metode Asesmen", "Bukti Portofolio", "Tips Lulus"],
    content: `# Persiapan Sertifikasi BNSP\n\n## 1. Mengapa Sertifikasi Penting?\n- Bukti kompetensi yang diakui nasional\n- Syarat tender proyek pemerintah\n- Meningkatkan earning power\n- Perlindungan hukum tenaga kerja\n\n## 2. Skema Sertifikasi Konstruksi\n**SKKNI — Standar Kompetensi Kerja Nasional Indonesia**\n\nContoh skema populer:\n- Tukang Batu Bangunan Gedung (Level 2)\n- Pelaksana Lapangan Pekerjaan Gedung (Level 4)\n- Supervisor Pekerjaan Konstruksi (Level 5)\n- Ahli Muda Teknik Bangunan Gedung (Level 6)\n\n## 3. Metode Asesmen\n**Tertulis/Lisan:**\n- Pertanyaan pengetahuan SKKNI\n- Multiple choice + uraian\n\n**Demonstrasi/Praktik:**\n- Tunjukkan kompetensi langsung\n- Simulasi pekerjaan lapangan\n\n**Portofolio:**\n- Foto bukti pekerjaan sebelumnya\n- Surat referensi klien/perusahaan\n- Sertifikat pelatihan\n\n## 4. Persiapan Dokumen\n✓ KTP & ijazah terakhir\n✓ CV dengan riwayat kerja lengkap\n✓ Foto portofolio (min 10 proyek)\n✓ Surat keterangan kerja/pengalaman\n✓ Sertifikat pelatihan yang relevan\n\n## 5. Tips Lulus Ujian\n- Pelajari SKKNI unit kompetensi yang diujikan\n- Latihan soal dari LSP terkait\n- Sediakan portofolio lengkap & terorganisir\n- Tunjukkan percaya diri saat demonstrasi`,
  },
  {
    id: 12, title: "Pekerjaan Plesteran & Acian Profesional",
    level: "Level 2 - Teknisi/Analis", category: "Finishing", duration: "25 menit", difficulty: "Mudah",
    description: "Teknik plesteran dan acian yang benar untuk menghasilkan permukaan dinding yang rata dan tidak retak.",
    topics: ["Campuran Plesteran", "Teknik Plester Rata", "Acian & Amplas", "Pencegahan Retak"],
    content: `# Pekerjaan Plesteran & Acian\n\n## 1. Campuran Plesteran (Mortar)\n**Plesteran untuk dinding (1PC:4Pasir):**\n- 1 ember semen Portland\n- 4 ember pasir bersih\n- Air secukupnya (tidak terlalu cair)\n\n**Plesteran untuk area basah (1PC:3Pasir):**\n- Lebih kuat, tahan air\n- Kamar mandi, area hujan\n\n**FYI:** Jangan pakai pasir laut (mengandung garam → retak/kembung)\n\n## 2. Langkah Plesteran\n1. Basahi bata/hebel sebelum plester (hindari kapilaritas)\n2. Pasang kepala plester (titik referensi ketebalan)\n3. Lempar adukan, ratakan dengan jidar aluminium\n4. Ketebalan: 15-20mm (bata merah), 10-15mm (hebel)\n5. Haluskan dengan roskam kayu\n6. Tunggu 7-14 hari sebelum diaci\n\n## 3. Teknik Acian\n**Campuran:** PC putih/OPC + air (pasta halus)\n**Ketebalan:** 2-3mm\n\n**Langkah:**\n1. Basahi plesteran terlebih dahulu\n2. Oleskan pasta semen tipis-tipis\n3. Gosokan melingkar dengan roskam besi\n4. Finishing satu arah (horizontal/vertikal)\n5. Curing: jaga kelembaban 3-7 hari\n\n## 4. Penyebab & Pencegahan Retak\n| Penyebab | Solusi |\n|----------|--------|\n| Plester terlalu tebal | Maks 20mm per lapis |\n| Air semen berlebih | w/c ratio tepat |\n| Penyusutan cepat | Curing dengan disemprot air |\n| Beda material | Pasang kawat ayam di sambungan |\n| Gempa/penurunan | Struktur kokoh dahulu |`,
  },
];

const MATERIALS: Material[] = [...CORE_MATERIALS, ...ELECTRICAL_MATERIALS];
const CATEGORIES_LIST = ["Semua", "K3", "Struktur", "Finishing", "Elektrikal", "Ketenagalistrikan", "Mekanikal", "Manajemen", "Sertifikasi"];
const LEVELS_LIST = ["Semua Level", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"];
const DIFFICULTY_COLORS: Record<string, string> = { Mudah: "bg-green-100 text-green-700", Menengah: "bg-amber-100 text-amber-700", Sulit: "bg-red-100 text-red-700" };

export default function StudyMaterialsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [level, setLevel] = useState("Semua Level");
  const [selected, setSelected] = useState<Material | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filtered = MATERIALS.filter((m) => {
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.topics.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = category === "Semua" || m.category === category;
    const matchLevel = level === "Semua Level" || m.level.startsWith(level);
    return matchSearch && matchCat && matchLevel;
  });

  const completedCount = completed.size;
  const progressPct = Math.round((completedCount / MATERIALS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Materi Belajar Konstruksi</h1>
          <p className="text-muted-foreground text-sm mt-1">{MATERIALS.length} materi · Kompetensi konstruksi & ketenagalistrikan</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-2xl">
            Materi ketenagalistrikan bersifat pengantar. Verifikasi klasifikasi usaha, sertifikat, dan perizinan terkini kepada sumber resmi.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">{completedCount}/{MATERIALS.length} selesai dipelajari</p>
          <Progress value={progressPct} className="w-32 h-2" />
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari materi, topik, atau kata kunci..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-1.5" onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4" /> Filter
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {CATEGORIES_LIST.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${category === c ? "bg-primary text-white border-primary" : "border-border hover:border-primary/50 text-muted-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
            <div className="w-full flex gap-1.5 flex-wrap">
              {LEVELS_LIST.map((l) => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${level === l ? "bg-indigo-600 text-white border-indigo-600" : "border-border hover:border-indigo-400 text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Materials Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => {
          const isDone = completed.has(m.id);
          return (
            <Card key={m.id} className={`hover:shadow-md transition-all cursor-pointer group relative ${isDone ? "ring-2 ring-emerald-300" : ""}`} onClick={() => setSelected(m)}>
              {isDone && (
                <div className="absolute top-3 right-3 z-10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              )}
              {m.isPremium && !isDone && (
                <div className="absolute top-3 right-3 z-10">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{m.category}</Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[m.difficulty]}`}>{m.difficulty}</span>
                </div>
                <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">{m.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.description}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {m.topics.slice(0, 2).map((t) => (
                    <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded">{t}</span>
                  ))}
                  {m.topics.length > 2 && <span className="text-xs text-muted-foreground">+{m.topics.length - 2} topik</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{m.duration}</span>
                  <span className="text-xs text-muted-foreground">{m.level.split(" ")[0]} {m.level.split(" ")[1]}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 py-12 text-center">
            <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Tidak ada materi yang sesuai pencarian</p>
          </div>
        )}
      </div>

      {/* Material Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary">{selected.category}</Badge>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[selected.difficulty]}`}>{selected.difficulty}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {selected.duration}</span>
                </div>
                <DialogTitle className="text-xl leading-tight">{selected.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{selected.level}</p>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {selected.topics.map((t) => (
                    <span key={t} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{t}</span>
                  ))}
                </div>
                <div className="prose prose-sm max-w-none text-foreground">
                  {selected.content.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h2>;
                    if (line.startsWith("## ")) return <h3 key={i} className="text-base font-bold mt-3 mb-1.5 text-primary">{line.slice(3)}</h3>;
                    if (line.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold mt-2 mb-1">{line.slice(4)}</h4>;
                    if (line.startsWith("- ")) return <div key={i} className="flex gap-2 text-sm py-0.5"><span className="text-primary mt-1">•</span><span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} /></div>;
                    if (line.startsWith("✓ ")) return <div key={i} className="flex gap-2 text-sm py-0.5 text-emerald-700"><CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /><span>{line.slice(2)}</span></div>;
                    if (line.startsWith("|")) return <div key={i} className="font-mono text-xs bg-muted px-3 py-1 border-b">{line}</div>;
                    if (line.trim() === "") return <div key={i} className="h-2" />;
                    return <p key={i} className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />;
                  })}
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <Button className="flex-1 gap-2"
                    variant={completed.has(selected.id) ? "outline" : "default"}
                    onClick={() => {
                      setCompleted((prev) => { const s = new Set(prev); s.has(selected.id) ? s.delete(selected.id) : s.add(selected.id); return s; });
                    }}>
                    {completed.has(selected.id) ? (<><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sudah Dipelajari</>) : (<><ChevronRight className="h-4 w-4" /> Tandai Selesai</>)}
                  </Button>
                  <Button variant="outline" onClick={() => setSelected(null)}>Tutup</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
