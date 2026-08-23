import { useState } from "react";
import { Users, Briefcase, FileText, TrendingUp, Shield, CheckCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminData, useAdminProfiles } from "@/hooks/useExperts";
import { useUser } from "@/hooks/useUser";
import { useLocation } from "wouter";
import { formatCurrency, getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const { data: analytics } = useAdminData();
  const { data: profiles = [] } = useAdminProfiles();
  const qc = useQueryClient();
  const { toast } = useToast();

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
        <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman administrasi.</p>
        <Button onClick={() => navigate("/")} className="mt-4">Ke Beranda</Button>
      </div>
    );
  }

  const handleVerify = async (userId: number, isVerified: boolean) => {
    try {
      await apiRequest("PUT", `/api/admin/verifications/${userId}`, { isVerified });
      toast({ title: isVerified ? "Pengguna Diverifikasi" : "Verifikasi Dicabut" });
      qc.invalidateQueries({ queryKey: ["/api/admin/profiles"] });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const stats = analytics ? [
    { label: "Total Pengguna", value: analytics.totalUsers, icon: <Users className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Proyek", value: analytics.totalJobs, icon: <Briefcase className="h-5 w-5" />, color: "text-green-600", bg: "bg-green-50" },
    { label: "Kontrak Aktif", value: analytics.activeContracts, icon: <FileText className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Transaksi", value: formatCurrency(analytics.totalRevenue), icon: <TrendingUp className="h-5 w-5" />, color: "text-orange-600", bg: "bg-orange-50" },
  ] : [];

  const workers = profiles.filter((p: any) => p.role === "tukang");
  const clients = profiles.filter((p: any) => p.role === "pelanggan");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-muted-foreground text-sm">Kelola platform KerjaProyek</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`${s.bg} ${s.color} p-2.5 rounded-xl`}>{s.icon}</div>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sub Stats */}
      {analytics && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Tenaga Ahli", value: analytics.totalWorkers },
            { label: "Pelanggan", value: analytics.totalClients },
            { label: "Proyek Aktif", value: analytics.activeJobs },
            { label: "Proyek Selesai", value: analytics.completedJobs },
            { label: "Terverifikasi", value: analytics.verifiedWorkers },
            { label: "Total Kontrak", value: analytics.totalContracts },
          ].map((s) => (
            <Card key={s.label} className="border-none shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="workers">
        <TabsList className="mb-6">
          <TabsTrigger value="workers">Tenaga Ahli ({workers.length})</TabsTrigger>
          <TabsTrigger value="clients">Pelanggan ({clients.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="workers">
          <div className="space-y-3">
            {workers.map((p: any) => (
              <Card key={p.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{p.fullName}</p>
                        {p.profile?.isVerified ? (
                          <Badge className="bg-green-100 text-green-700 border-none text-xs">Terverifikasi</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Belum Terverifikasi</Badge>
                        )}
                        {p.profile?.isMandor && <Badge className="bg-purple-100 text-purple-700 border-none text-xs">Mandor</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                      {p.profile?.skills?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{p.profile.skills.slice(0, 3).join(", ")}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!p.profile?.isVerified ? (
                        <Button size="sm" onClick={() => handleVerify(p.id, true)} className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Verifikasi
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleVerify(p.id, false)} className="gap-1 text-destructive border-destructive">
                          <X className="h-3 w-3" /> Cabut
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <div className="space-y-3">
            {clients.map((p: any) => (
              <Card key={p.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{p.fullName}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Pelanggan</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
