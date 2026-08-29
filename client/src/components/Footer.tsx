import { Link } from "wouter";
import { HardHat } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-800 via-indigo-950 to-blue-950 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-gradient-to-br from-slate-700 via-indigo-800 to-blue-900 p-2.5 rounded-2xl shadow-sm">
                <HardHat className="h-14 w-14 text-orange-500" strokeWidth={2.25} />
              </div>
              <span className="bg-gradient-to-r from-white via-sky-200 to-blue-300 bg-clip-text text-transparent font-extrabold text-5xl tracking-[0.04em] leading-[0.82]">
                <span className="block">KERJA</span>
                <span className="block">PROYEK</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm">
              Platform marketplace kerja konstruksi Indonesia — menghubungkan owner/boher dengan tukang, 
              mandor, dan tenaga ahli SKK jenjang 1–9 untuk pekerjaan harian maupun borongan.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/jobs" className="hover:text-white transition-colors">Cari Proyek</Link></li>
              <li><Link href="/experts" className="hover:text-white transition-colors">Cari Tenaga Ahli</Link></li>
              <li><Link href="/contracts" className="hover:text-white transition-colors">Kelola Kontrak</Link></li>
              <li><Link href="/cost-estimator" className="hover:text-white transition-colors">Estimator Biaya</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-3">Sumber Daya</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/study-materials" className="hover:text-white transition-colors">Materi Belajar</Link></li>
              <li><Link href="/competency-test" className="hover:text-white transition-colors">Uji Kompetensi</Link></li>
              <li><Link href="/chatbot" className="hover:text-white transition-colors">AI Assistant</Link></li>
              <li><Link href="/psikotest" className="hover:text-white transition-colors">Psikotest</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          © 2025 KerjaProyek. Platform Marketplace Kerja Konstruksi Indonesia
        </div>
      </div>
    </footer>
  );
}
