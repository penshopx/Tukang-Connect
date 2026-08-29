import { useState } from "react";
import { useLocation } from "wouter";
import {
  Search, Star, MapPin, CheckCircle, Shield, Users, Filter,
  Award, TrendingUp, Zap, ChevronRight, Loader2, Bot,
  GraduationCap, Briefcase, ArrowRight, HardHat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useExperts } from "@/hooks/useExperts";
import { compareNullableMoney, formatCurrency, getInitials } from "@/lib/utils";
import { JOB_CATEGORIES } from "@/lib/constants";

const KKNI_COLORS: Record<string, string> = {
  "Level 1": "bg-gray-100 text-gray-700",
  "Level 2": "bg-gray-100 text-gray-700",
  "Level 3": "bg-green-100 text-green-700",
  "Level 4": "bg-green-100 text-green-700",
  "Level 5": "bg-blue-100 text-blue-700",
  "Level 6": "bg-blue-100 text-blue-700",
  "Level 7": "bg-purple-100 text-purple-700",
  "Level 8": "bg-purple-100 text-purple-700",
  "Level 9": "bg-amber-100 text-amber-700",
};

const SORT_OPTIONS = [
  { value: "rating", label: "Rating Tertinggi" },
  { value: "projects", label: "Proyek Terbanyak" },
  { value: "rate_low", label: "Tarif Terendah" },
  { value: "rate_high", label: "Tarif Tertinggi" },
];

const QUICK_SKILLS = [
  "Beton Bertulang", "K3", "Plesteran", "MEP", "BIM", "Struktur Baja",
  "Pondasi", "Arsitektur", "Pengecatan", "Keramik", "Las", "Sipil",
];

export default function ExpertsPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  const { data: rawExperts = [], isLoading } = useExperts({
    search: activeSkill ? activeSkill : (search || undefined),
    category: category === "all" ? undefined : category,
    verified: verified || undefined,
  });

  const experts = [...rawExperts].sort((a: any, b: any) => {
    if (sort === "projects") return (b.completedProjects || 0) - (a.completedProjects || 0);
    if (sort === "rate_low") return compareNullableMoney(a.hourlyRate, b.hourlyRate, "asc");
    if (sort === "rate_high") return compareNullableMoney(a.hourlyRate, b.hourlyRate, "desc");
    return b.rating - a.rating;
  });

  const verifiedCount = experts.filter((e: any) => e.isVerified).length;
  const mandorCount = experts.filter((e: any) => e.isMandor).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary" /> Cari Tenaga Ahli
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {experts.length} tenaga ahli · {verifiedCount} terverifikasi · {mandorCount} mandor
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-xl">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span>AI Matching aktif — skor otomatis dihitung</span>
        </div>
      </div>

      {/* Quick Skill Pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {QUICK_SKILLS.map(skill => (
          <button
            key={skill}
            onClick={() => setActiveSkill(activeSkill === skill ? null : skill)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              activeSkill === skill
                ? "bg-primary text-white border-primary"
                : "bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
            }`}
          >
            {skill}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, keahlian, atau kota..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveSkill(null); }}
            className="pl-9"
          />
        </div>
        <Button
          variant={verified ? "default" : "outline"}
          onClick={() => setVerified(!verified)}
          className="gap-2 shrink-0"
        >
          <CheckCircle className="h-4 w-4" />
          {verified ? "✓ Verified" : "Terverifikasi"}
        </Button>
        <Button variant="outline" className="gap-1.5 shrink-0" onClick={() => setShowFilters(v => !v)}>
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl border mb-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {JOB_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex gap-4 mb-5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> {verifiedCount} Terverifikasi BNSP/KKNI
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> {mandorCount} Mandor Berpengalaman
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> {experts.length - verifiedCount} Tukang Umum
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground text-sm">Mencari tenaga ahli terbaik...</p>
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">Tidak ada tenaga ahli ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">Coba ubah filter atau kata kunci pencarian</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setCategory("all"); setActiveSkill(null); setVerified(false); }}>
            Reset Filter
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {experts.map((expert: any) => {
            const kkniColor = expert.kkniLevel ? KKNI_COLORS[expert.kkniLevel] || "bg-blue-100 text-blue-700" : null;
            return (
              <Card
                key={expert.userId}
                className="hover:shadow-lg transition-all cursor-pointer group border-border/60 hover:border-primary/30 overflow-hidden"
                onClick={() => navigate(`/experts/${expert.userId}`)}
              >
                <CardContent className="p-0">
                  {/* Top gradient bar */}
                  <div className={`h-1.5 w-full ${expert.isVerified ? "bg-gradient-to-r from-blue-500 to-primary" : "bg-muted"}`} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-14 w-14 ring-2 ring-primary/10 shrink-0">
                        <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                          {getInitials(expert.user.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">
                            {expert.user.fullName}
                          </h3>
                          {expert.isVerified && (
                            <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        {expert.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {expert.location}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-bold">{expert.rating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({expert.ratingCount})</span>
                          </div>
                          {expert.isMandor && (
                            <Badge className="text-xs h-4 px-1.5 bg-purple-100 text-purple-700 border-none font-medium">Mandor</Badge>
                          )}
                          {kkniColor && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${kkniColor}`}>
                              SKK {expert.kkniLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    {expert.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{expert.bio}</p>
                    )}

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {expert.skills.slice(0, 4).map((skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                      {expert.skills.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{expert.skills.length - 4}</Badge>
                      )}
                    </div>

                    {/* Certifications */}
                    {expert.certifications?.length > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <Award className="h-3 w-3 text-amber-500" />
                        <p className="text-xs text-amber-700 font-medium">{expert.certifications.slice(0, 2).join(" · ")}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        {expert.hourlyRate ? (
                          <p className="font-bold text-primary text-sm">
                            {formatCurrency(expert.hourlyRate)}
                            <span className="text-muted-foreground font-normal text-xs">/jam</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Harga nego</p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {expert.completedProjects} proyek selesai
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {expert.isVerified && (
                          <Badge className="text-xs h-5 px-1.5 bg-blue-50 text-blue-700 border border-blue-200">
                            ✓ Verified
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-6 gap-1 text-primary"
                          onClick={(e) => { e.stopPropagation(); navigate(`/experts/${expert.userId}`); }}
                        >
                          Lihat Profil <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom CTA */}
      {experts.length > 0 && (
        <div className="mt-8 p-5 bg-gradient-to-r from-primary/5 to-blue-50 border border-primary/20 rounded-2xl text-center">
          <p className="font-bold text-base mb-1">Tidak menemukan tenaga ahli yang cocok?</p>
          <p className="text-sm text-muted-foreground mb-4">Posting proyek Anda dan biarkan tukang terbaik yang melamar ke Anda</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button className="gap-2" onClick={() => navigate("/jobs/create")}>
              <Zap className="h-4 w-4" /> Posting Proyek
            </Button>
            <Button variant="outline" onClick={() => navigate("/klinika")} className="gap-2">
              <Bot className="h-4 w-4" /> Konsultasi AI Gratis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
