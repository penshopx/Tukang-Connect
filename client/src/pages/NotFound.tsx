import { useLocation } from "wouter";
import { HardHat, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="text-center">
        <div className="bg-muted p-6 rounded-2xl w-fit mx-auto mb-6">
          <HardHat className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-xl font-semibold mb-2">Halaman Tidak Ditemukan</p>
        <p className="text-muted-foreground mb-6">Maaf, halaman yang Anda cari tidak ada.</p>
        <Button onClick={() => navigate("/")} className="gap-2">
          <Home className="h-4 w-4" /> Ke Beranda
        </Button>
      </div>
    </div>
  );
}
