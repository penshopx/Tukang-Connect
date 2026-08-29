import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft, MapPin, Clock, DollarSign, User, Send,
  CheckCircle, AlertCircle, FileText, MessageSquare, Brain, Trophy, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useUser } from "@/hooks/useUser";
import { useJob, useJobApplications, useApplyJob, useJobMessages, useSendMessage, useAcceptApplication } from "@/hooks/useJobs";
import { formatCurrency, formatDate, formatRelativeTime, getInitials, getStatusColor, getStatusLabel } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import AgentMatchPanel from "@/components/AgentMatchPanel";
import AgentRankPanel from "@/components/AgentRankPanel";

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const [, navigate] = useLocation();
  const jobId = Number(params?.id);
  const { data: user } = useUser();
  const { data: job, isLoading } = useJob(jobId);
  const { data: applications = [] } = useJobApplications(jobId);
  const { data: messages = [] } = useJobMessages(jobId);
  const { mutate: applyJob, isPending: applying } = useApplyJob();
  const { mutate: sendMsg, isPending: sending } = useSendMessage();
  const { mutate: acceptApp, isPending: accepting } = useAcceptApplication();
  const { toast } = useToast();

  const [applyMsg, setApplyMsg] = useState("");
  const [proposedBudget, setProposedBudget] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("applications");
  const [msgContent, setMsgContent] = useState("");

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary" />
    </div>
  );

  if (!job) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Proyek tidak ditemukan</p>
      <Button onClick={() => navigate("/jobs")} className="mt-3">Kembali ke Daftar</Button>
    </div>
  );

  const isClient = user?.id === job.clientId;
  const isWorker = user?.id === job.workerId;
  const isTukang = user?.role === "tukang";
  // Withdrawn/rejected applications remain visible as history, but should not
  // hide the apply action because they are no longer active submissions.
  const hasApplied = applications.some(
    (a: any) =>
      a.applicantId === user?.id &&
      (a.status === "pending" || a.status === "accepted")
  );
  const isParticipant = isClient || isWorker;
  const pendingApps = applications.filter((a: any) => a.status === "pending");

  const handleApply = () => {
    applyJob(
      { jobId, message: applyMsg || undefined, proposedBudget: proposedBudget ? Number(proposedBudget) : undefined },
      {
        onSuccess: () => {
          toast({ title: "Lamaran terkirim!", description: "Klien akan meninjau lamaran Anda." });
          setApplyOpen(false);
        },
        onError: (err) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleAcceptApplication = (appId: number, _workerId: number) => {
    acceptApp(
      { jobId, appId },
      {
        onSuccess: (data: any) => {
          toast({
            title: "Lamaran Diterima! 🎉",
            description: `Kontrak dibuat otomatis dengan ${data.milestonesCreated} milestone pembayaran.`,
          });
          navigate(`/contracts/${data.contract.id}`);
        },
        onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleSendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim()) return;
    sendMsg({ jobId, content: msgContent }, {
      onSuccess: () => setMsgContent(""),
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate("/jobs")} className="flex items-center gap-1 text-muted-foreground mb-6 hover:text-foreground text-sm">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Proyek
      </button>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <div className="bg-primary/5 p-6 border-b border-primary/10 rounded-t-xl">
              <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
                <Badge variant="outline" className="text-primary border-primary/20">{job.category}</Badge>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(job.status)}`}>
                  {getStatusLabel(job.status)}
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-3">{job.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {formatRelativeTime(job.createdAt)}</span>
                {job.deadline && (
                  <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Deadline: {formatDate(job.deadline)}</span>
                )}
              </div>
            </div>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-3">Deskripsi Proyek</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="applications">
                Lamaran ({applications.length})
              </TabsTrigger>
              {isClient && pendingApps.length > 0 && (
                <TabsTrigger value="ranking" className="gap-1">
                  <Brain className="h-3 w-3" />
                  Ranking AI
                  <Badge className="h-4 text-xs ml-1">{pendingApps.length}</Badge>
                </TabsTrigger>
              )}
              {isParticipant && (
                <TabsTrigger value="messages">
                  Pesan ({messages.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Lamaran biasa */}
            <TabsContent value="applications" className="mt-4">
              {applications.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada lamaran masuk</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {isClient && pendingApps.length > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10 cursor-pointer hover:bg-primary/8 transition-colors"
                      onClick={() => setActiveTab("ranking")}>
                      <Brain className="h-4 w-4 text-primary" />
                      <p className="text-sm text-primary font-medium">
                        Ada {pendingApps.length} lamaran — lihat ranking AI untuk rekomendasi terbaik
                      </p>
                      <Trophy className="h-4 w-4 text-amber-500 ml-auto" />
                    </div>
                  )}
                  {applications.map((app: any) => (
                    <Card key={app.id} className="border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{getInitials(app.applicant?.fullName || "?")}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm">{app.applicant?.fullName}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(app.createdAt)}</p>
                              {app.message && <p className="text-sm mt-2 text-muted-foreground">{app.message}</p>}
                              {app.proposedBudget && (
                                <p className="text-sm font-semibold text-primary mt-1">
                                  Tawaran: {formatCurrency(app.proposedBudget)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(app.status)}`}>
                              {getStatusLabel(app.status)}
                            </span>
                            {isClient && job.status === "open" && app.status === "pending" && (
                              <Button size="sm" onClick={() => handleAcceptApplication(app.id, app.applicantId)}>
                                Terima
                              </Button>
                            )}
                            {app.applicant?.profile && (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/experts/${app.applicantId}`)}>
                                Profil
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tab: Ranking AI */}
            {isClient && (
              <TabsContent value="ranking" className="mt-4">
                <AgentRankPanel
                  jobId={jobId}
                  jobStatus={job.status}
                  onAccept={handleAcceptApplication}
                />
              </TabsContent>
            )}

            {/* Tab: Pesan */}
            {isParticipant && (
              <TabsContent value="messages" className="mt-4">
                <Card className="border-border/60">
                  <CardContent className="p-4">
                    <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                      {messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-6">Belum ada pesan. Mulai diskusi sekarang.</p>
                      ) : (
                        messages.map((msg: any) => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${isMe ? "bg-primary text-white" : "bg-muted"}`}>
                                {!isMe && <p className="font-semibold text-xs mb-1">{msg.sender?.fullName}</p>}
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-muted-foreground"}`}>
                                  {formatRelativeTime(msg.createdAt)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <form onSubmit={handleSendMsg} className="flex gap-2">
                      <Input
                        value={msgContent}
                        onChange={(e) => setMsgContent(e.target.value)}
                        placeholder="Tulis pesan..."
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={sending}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="text-3xl font-bold text-primary mb-1">{formatCurrency(job.budget)}</div>
              <p className="text-sm text-muted-foreground mb-4">Anggaran Proyek</p>

              {user ? (
                <>
                  {isTukang && job.status === "open" && !hasApplied && (
                    <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full mb-2">Ajukan Lamaran</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajukan Lamaran</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Pesan (Opsional)</label>
                            <Textarea
                              placeholder="Jelaskan mengapa Anda cocok untuk proyek ini..."
                              value={applyMsg}
                              onChange={(e) => setApplyMsg(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Tawaran Harga (Opsional)</label>
                            <Input
                              type="number"
                              placeholder="500000"
                              value={proposedBudget}
                              onChange={(e) => setProposedBudget(e.target.value)}
                            />
                          </div>
                          <Button className="w-full" onClick={handleApply} disabled={applying}>
                            {applying ? "Mengirim..." : "Kirim Lamaran"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {hasApplied && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Anda sudah melamar
                    </div>
                  )}
                  {isClient && (
                    <Button
                      className="w-full gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90"
                      onClick={() => navigate(`/jobs/${jobId}/brain`)}
                    >
                      <Brain className="h-4 w-4" /> Brain Project
                      <Zap className="h-3.5 w-3.5 text-yellow-300" />
                    </Button>
                  )}
                  {isClient && job.status === "in_progress" && (
                    <Button className="w-full mt-2" onClick={() => navigate("/contracts")} variant="outline">
                      <FileText className="h-4 w-4 mr-2" /> Lihat Kontrak Aktif
                    </Button>
                  )}
                </>
              ) : (
                <Button className="w-full" onClick={() => navigate("/login")}>
                  Masuk untuk Melamar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          {job.client && (
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Diposting oleh</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(job.client.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{job.client.fullName}</p>
                    <p className="text-xs text-muted-foreground">Pelanggan</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Worker Info */}
          {job.worker && (
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tenaga Ahli</p>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(job.worker.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{job.worker.fullName}</p>
                    <p className="text-xs text-muted-foreground">Tenaga Ahli</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/experts/${job.workerId}`)}>
                  Lihat Profil
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Agent: Worker Recommendations — for client on open jobs */}
          {isClient && job.status === "open" && (
            <AgentMatchPanel jobId={jobId} />
          )}
        </div>
      </div>
    </div>
  );
}
