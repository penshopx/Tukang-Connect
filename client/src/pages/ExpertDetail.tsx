import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Star, MapPin, CheckCircle, Shield, Briefcase, Phone, Award, TrendingUp, Clock, MessageSquare, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useExpert } from "@/hooks/useExperts";
import { dailyRate, formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";

const KKNI_DESCRIPTIONS: Record<string, string> = {
  "Level 1": "Operator — pelaksana tugas sederhana",
  "Level 2": "Teknisi — melaksanakan & mengontrol",
  "Level 3": "Teknisi Madya — menganalisis & mengevaluasi",
  "Level 4": "Supervisor — merencanakan & mengawasi",
  "Level 5": "Kepala Pelaksana — mengelola tim lapangan",
  "Level 6": "Ahli Muda — perancangan & spesifikasi",
  "Level 7": "Ahli Madya — manajer proyek senior",
  "Level 8": "Ahli Utama — direktur teknis",
  "Level 9": "Konsultan — advisor strategis",
};

function TrustScore({ profile }: { profile: any }) {
  const scores: Array<{ label: string; value: number; max: number; color: string }> = [
    { label: "Rating Klien", value: Math.min(profile.rating * 10, 50), max: 50, color: "bg-yellow-500" },
    { label: "Verifikasi", value: profile.isVerified ? 20 : 0, max: 20, color: "bg-blue-500" },
    { label: "Pengalaman", value: Math.min(profile.yearsExperience || 0, 10) * 1.5, max: 15, color: "bg-emerald-500" },
    { label: "Sertifikasi", value: Math.min(profile.certifications?.length || 0, 3) * 5, max: 15, color: "bg-purple-500" },
  ];
  const total = scores.reduce((s, i) => s + i.value, 0);
  const pct = Math.round(total);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Skor Kepercayaan
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center mb-3">
          <span className={`text-4xl font-black ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>{pct}</span>
          <span className="text-muted-foreground text-sm">/100</span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pct >= 80 ? "Sangat Terpercaya" : pct >= 65 ? "Terpercaya" : pct >= 50 ? "Cukup Terpercaya" : "Perlu Verifikasi"}
          </p>
        </div>
        <div className="space-y-2">
          {scores.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium">{Math.round(s.value)}/{s.max}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${(s.value / s.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < Math.round(value) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

export default function ExpertDetail() {
  const [, params] = useRoute("/experts/:userId");
  const [, navigate] = useLocation();
  const userId = Number(params?.userId);
  const { data: expert, isLoading } = useExpert(userId);
  const { data: user } = useUser();

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary" />
    </div>
  );

  if (!expert) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Tenaga ahli tidak ditemukan</p>
      <Button onClick={() => navigate("/experts")} className="mt-3">Kembali</Button>
    </div>
  );

  const avgRating = expert.reviews?.length
    ? expert.reviews.reduce((s: number, r: any) => s + r.rating, 0) / expert.reviews.length
    : (expert.rating || 0);

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: expert.reviews?.filter((r: any) => r.rating === star).length || 0,
  }));
  const totalReviews = expert.reviews?.length || 0;

  const kkniPrefix = expert.kkniLevel?.match(/Level \d/)?.[0] || "";
  const kkniDesc = KKNI_DESCRIPTIONS[kkniPrefix] || "";

  const dayRate = expert.hourlyRate ? dailyRate(expert.hourlyRate) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate("/experts")} className="flex items-center gap-1 text-muted-foreground mb-6 hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Tenaga Ahli
      </button>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Profile Card */}
          <Card className="shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 to-indigo-50 p-6 text-center pb-4">
              <Avatar className="h-24 w-24 mx-auto mb-3 ring-4 ring-white shadow-md">
                <AvatarFallback className="text-2xl bg-primary text-white">{getInitials(expert.user.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <h1 className="text-xl font-bold">{expert.user.fullName}</h1>
                {expert.isVerified && <CheckCircle className="h-5 w-5 text-blue-500" />}
              </div>
              {expert.location && (
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mb-3">
                  <MapPin className="h-3 w-3" /> {expert.location}
                </p>
              )}
              <div className="flex justify-center gap-1 mb-2">
                <StarRating value={avgRating} />
                <span className="text-sm font-semibold ml-1">{avgRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{totalReviews} ulasan</p>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {expert.isVerified && <Badge className="bg-blue-100 text-blue-700 border-none text-xs">✓ Terverifikasi</Badge>}
                {expert.isMandor && <Badge className="bg-purple-100 text-purple-700 border-none text-xs">Mandor</Badge>}
              </div>
            </div>
            <CardContent className="p-4">
              {/* KKNI Level */}
              {expert.kkniLevel && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl mb-3">
                  <p className="text-xs font-bold text-amber-800">{expert.kkniLevel}</p>
                  {kkniDesc && <p className="text-xs text-amber-700 mt-0.5">{kkniDesc}</p>}
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-muted rounded-xl p-2.5 text-center">
                  <p className="text-xl font-black text-primary">{expert.completedProjects}</p>
                  <p className="text-xs text-muted-foreground">Proyek Selesai</p>
                </div>
                <div className="bg-muted rounded-xl p-2.5 text-center">
                  <p className="text-xl font-black text-primary">{expert.yearsExperience || "—"}</p>
                  <p className="text-xs text-muted-foreground">Tahun Pengalaman</p>
                </div>
              </div>

              {/* Rate */}
              {expert.hourlyRate && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                    <p className="text-sm font-bold text-emerald-700 break-all">{formatCurrency(expert.hourlyRate)}</p>
                    <p className="text-xs text-emerald-600">/jam</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-xl text-center border border-blue-100">
                    <p className="text-sm font-bold text-blue-700 break-all">{formatCurrency(dayRate!)}</p>
                    <p className="text-xs text-blue-600">/hari (8 jam)</p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {expert.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 p-2 bg-muted rounded-lg">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">{expert.phone}</span>
                </div>
              )}

              {/* CTA */}
              {user && user.id !== userId && (
                <Button className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600" onClick={() => navigate("/jobs/create")}>
                  <Briefcase className="h-4 w-4" /> Hire Sekarang
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Trust Score */}
          <TrustScore profile={expert} />

          {/* Certifications */}
          {expert.certifications?.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Sertifikasi
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {expert.certifications.map((cert: string) => (
                  <div key={cert} className="flex items-center gap-2 text-sm p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <CheckCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-amber-800">{cert}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-5">
          {/* Bio */}
          {expert.bio && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Tentang</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <p className="text-muted-foreground leading-relaxed">{expert.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Skills with level bars */}
          {expert.skills?.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Keahlian & Spesialisasi</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {expert.skills.map((skill: string, i: number) => {
                    const level = Math.min(85 + (i % 3) * 5, 100);
                    const color = level >= 90 ? "bg-primary" : "bg-blue-400";
                    return (
                      <div key={skill} className="group relative">
                        <Badge variant="secondary" className="text-sm pr-3 gap-1.5 cursor-default hover:bg-primary/10 transition-colors">
                          {skill}
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                {expert.category && (
                  <div className="mt-3 p-2.5 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-xs font-medium text-primary">🎯 Spesialisasi Utama: <span className="font-bold">{expert.category}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick stats banner */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, label: "Proyek Selesai", value: expert.completedProjects, bg: "bg-emerald-50" },
              { icon: <Star className="h-4 w-4 text-yellow-500" />, label: "Rating", value: `${avgRating.toFixed(1)}/5.0`, bg: "bg-yellow-50" },
              { icon: <Clock className="h-4 w-4 text-blue-600" />, label: "Pengalaman", value: `${expert.yearsExperience || "—"} tahun`, bg: "bg-blue-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="font-bold text-sm">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Portfolio */}
          {expert.portfolio?.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Portfolio Pekerjaan</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <div className="grid sm:grid-cols-2 gap-3">
                  {expert.portfolio.map((item: any) => (
                    <div key={item.id} className="border rounded-xl p-4 hover:shadow-sm transition-all hover:border-primary/30 group">
                      <div className="bg-gradient-to-br from-primary/10 to-indigo-50 rounded-lg h-24 mb-3 flex items-center justify-center">
                        <Briefcase className="h-7 w-7 text-primary/40 group-hover:text-primary/60 transition-colors" />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(item.completedAt)}</span>
                      </div>
                      {item.clientName && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> Klien: {item.clientName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reviews with distribution */}
          {expert.reviews?.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Ulasan Klien ({totalReviews})</CardTitle>
                  <div className="flex items-center gap-1">
                    <StarRating value={avgRating} />
                    <span className="font-bold text-sm ml-1">{avgRating.toFixed(1)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Rating distribution */}
                <div className="mb-4 space-y-1.5">
                  {ratingDist.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{star}</span>
                      <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 shrink-0" />
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%" }} />
                      </div>
                      <span className="w-4 text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {expert.reviews.map((review: any) => (
                    <div key={review.id} className="border rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-muted">{getInitials(review.reviewer?.fullName || "?")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{review.reviewer?.fullName}</p>
                            <StarRating value={review.rating} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No reviews */}
          {(!expert.reviews || expert.reviews.length === 0) && (
            <Card className="shadow-sm">
              <CardContent className="py-8 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Belum ada ulasan untuk tenaga ahli ini</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
