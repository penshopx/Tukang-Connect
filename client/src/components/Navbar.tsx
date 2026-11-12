import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell, Menu, X, HardHat, ChevronDown, User, LogOut,
  LayoutDashboard, Briefcase, Users, FileText, AlertTriangle,
  MessageSquare, Calculator, BookOpen, Wrench,
  Bot, Trophy, Building2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser, useLogout, useUnreadCount } from "@/hooks/useUser";
import { getInitials } from "@/lib/utils";

type ToolItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  highlight?: boolean;
};

type ToolGroup = {
  label: string;
  items: ToolItem[];
};

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { data: user } = useUser();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: unread } = useUnreadCount(user?.id);

  const isTukang = user?.role === "tukang";
  const isAdmin = user?.role === "admin";
  const isPelanggan = user?.role === "pelanggan" || !user?.role;

  const navLinks = [
    { href: "/jobs", label: "Proyek", icon: <Briefcase className="h-4 w-4" /> },
    { href: "/experts", label: "Tenaga Ahli", icon: <Users className="h-4 w-4" /> },
    { href: "/contracts", label: "Kontrak", icon: <FileText className="h-4 w-4" />, auth: true },
  ];

  const toolGroups: ToolGroup[] = [
    {
      label: "Konsultasi & AI",
      items: [
        { href: "/chatbot", label: "AI Chatbot Helpdesk", icon: <Bot className="h-4 w-4 text-primary" />, badge: "Dukungan AI", highlight: true },
        { href: "/klinika", label: "Klinika Teknis", icon: <MessageSquare className="h-4 w-4 text-purple-500" />, badge: "Forum+AI" },
      ],
    },
    {
      label: "Alat Estimasi & Proyek",
      items: [
        { href: "/cost-estimator", label: "Estimator Biaya RAB", icon: <Calculator className="h-4 w-4 text-amber-500" />, badge: "Acuan SNI & AHSP" },
        { href: "/jobs", label: "Cari Proyek", icon: <Briefcase className="h-4 w-4 text-blue-500" /> },
        { href: "/bedah-dokumen", label: "Penelaah Dokumen", icon: <FileText className="h-4 w-4 text-sky-600" />, badge: "Lokal" },
      ],
    },
    {
      label: "Edukasi & Sertifikasi",
      items: [
        { href: "/competency-test", label: "Simulasi Kompetensi", icon: <Trophy className="h-4 w-4 text-rose-500" />, badge: "Latihan" },
        { href: "/study-materials", label: "Materi Belajar", icon: <BookOpen className="h-4 w-4 text-green-500" /> },
      ],
    },
    {
      label: "Ruang Kerja",
      items: [
        { href: "/ruang-kerja", label: "Pusat Kerja", icon: <Building2 className="h-4 w-4 text-blue-500" />, badge: "KerjaProyek" },
      ],
    },
  ];

  const allToolLinks = toolGroups.flatMap(g => g.items);

  const isActive = (href: string) => location.startsWith(href);

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-24 py-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 font-bold shrink-0">
            <div className="bg-gradient-to-br from-slate-700 via-indigo-800 to-blue-900 p-2.5 rounded-2xl shadow-sm">
              <HardHat className="h-14 w-14 text-orange-500" strokeWidth={2.25} />
            </div>
            <span className="hidden sm:block bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500 bg-clip-text text-transparent text-3xl lg:text-5xl font-extrabold tracking-[0.04em] leading-[0.82]">
              <span className="block">KERJA</span>
              <span className="block">PROYEK</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) =>
              !link.auth || user ? (
                <Link key={link.href} href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}>
                  {link.icon} {link.label}
                </Link>
              ) : null
            )}

            {/* Tools Dropdown — hover + click */}
            <div
              className="relative"
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
            >
              <button
                onClick={() => setToolsOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  allToolLinks.some(l => isActive(l.href)) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Zap className="h-4 w-4" />
                Tools
                <ChevronDown className={`h-3 w-3 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
              </button>

              {toolsOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-2xl border shadow-xl z-50 overflow-hidden">
                  {toolGroups.map(group => (
                    <div key={group.label}>
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                      </div>
                      {group.items.map(item => (
                        <Link key={item.href} href={item.href}
                          onClick={() => setToolsOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted transition-colors mx-1 rounded-xl ${
                            isActive(item.href) ? "bg-primary/5 text-primary" : "text-muted-foreground"
                          }`}>
                          <span className="shrink-0">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                              item.highlight ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ))}
                  <div className="p-2 border-t mt-1">
                    <Link href="/chatbot" onClick={() => setToolsOpen(false)}>
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
                        <Bot className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-primary">AI Helpdesk — Tanya Apa Saja</p>
                          <p className="text-[10px] text-muted-foreground">Dukungan AI spesialis konstruksi</p>
                        </div>
                        <div className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                {/* Quick Chatbot access */}
                <Link href="/chatbot" className="hidden md:flex">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-primary border border-primary/20 hover:bg-primary/5">
                    <Bot className="h-4 w-4" />
                    <span className="hidden lg:block text-xs">AI Chat</span>
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  </Button>
                </Link>

                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="hidden md:flex gap-1 text-xs">
                      Admin
                    </Button>
                  </Link>
                )}

                <Link href="/dashboard">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unread?.count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {unread.count > 9 ? "9+" : unread.count}
                      </span>
                    )}
                  </Button>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label={`Buka menu pengguna ${user.fullName}`}
                    className="flex items-center gap-2 p-1 rounded-xl hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold max-w-[100px] truncate leading-none">{user.fullName.split(" ")[0]}</p>
                      <p className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">
                        {user.role === "tukang" ? "Tenaga Ahli" : user.role === "admin" ? "Admin" : "Owner"}
                      </p>
                    </div>
                    <ChevronDown className="h-3 w-3 hidden md:block text-muted-foreground" />
                  </button>

                  {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-card rounded-2xl border shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b bg-muted/30">
                        <p className="font-bold text-sm truncate">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <Badge variant="outline" className="mt-1 text-[10px] h-4">
                          {user.role === "tukang" ? "👷 Tenaga Ahli" : user.role === "admin" ? "⚙️ Admin" : "🏠 Owner/Boher"}
                        </Badge>
                      </div>
                      <div className="p-1.5">
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted w-full transition-colors">
                          <LayoutDashboard className="h-4 w-4 text-primary" /> Dashboard
                        </Link>
                        {isTukang && (
                          <Link href="/portfolio" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted w-full transition-colors">
                            <Briefcase className="h-4 w-4" /> Portfolio Saya
                          </Link>
                        )}
                        <Link href="/profile/edit" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted w-full transition-colors">
                          <User className="h-4 w-4" /> Edit Profil
                        </Link>
                        <Link href="/chatbot" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted w-full transition-colors">
                          <Bot className="h-4 w-4 text-primary" /> AI Chatbot
                          <span className="ml-auto w-1.5 h-1.5 bg-green-500 rounded-full" />
                        </Link>
                        <Link href="/disputes" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-muted w-full transition-colors">
                          <AlertTriangle className="h-4 w-4" /> Sengketa
                        </Link>
                        <div className="border-t my-1" />
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout(undefined, {
                              onSuccess: () => navigate("/login"),
                            });
                          }}
                          disabled={isLoggingOut}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl hover:bg-red-50 hover:text-destructive w-full transition-colors text-destructive"
                        >
                          <LogOut className="h-4 w-4" /> Keluar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/chatbot" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary">
                    <Bot className="h-3.5 w-3.5" /> AI Chat
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-sm">Masuk</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="text-sm">Daftar Gratis</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-3 py-3 space-y-0.5 max-h-[80vh] overflow-y-auto">
          {navLinks.map((link) =>
            !link.auth || user ? (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}>
                {link.icon} {link.label}
              </Link>
            ) : null
          )}

          {/* Tool groups in mobile */}
          {toolGroups.map(group => (
            <div key={group.label} className="pt-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pb-1">{group.label}</p>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive(item.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}>
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{item.badge}</span>
                  )}
                </Link>
              ))}
            </div>
          ))}

          {!user && (
            <div className="flex gap-2 pt-3 border-t mt-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                <Button variant="outline" className="w-full text-sm">Masuk</Button>
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1">
                <Button className="w-full text-sm">Daftar Gratis</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
