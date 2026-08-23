import { useLocation } from "wouter";
import { Plus, Briefcase, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { useMyJobs } from "@/hooks/useJobs";
import { formatCurrency, formatRelativeTime, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function MyJobsPage() {
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const { data: jobs = [], isLoading } = useMyJobs(user?.id);

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-muted-foreground">Silakan masuk terlebih dahulu.</p>
      <Button onClick={() => navigate("/login")} className="mt-3">Masuk</Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proyek Saya</h1>
          <p className="text-muted-foreground text-sm">{jobs.length} proyek diposting</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/jobs/create")}>
          <Plus className="h-4 w-4" /> Buat Proyek Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary mx-auto" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground font-medium">Belum ada proyek diposting</p>
          <p className="text-sm text-muted-foreground mt-1">Buat proyek pertama Anda untuk mencari tenaga ahli</p>
          <Button className="mt-4" onClick={() => navigate("/jobs/create")}>Buat Proyek</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job: any) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                      <span className="text-xs bg-secondary px-2.5 py-0.5 rounded-full">{job.category}</span>
                    </div>
                    <h3 className="font-semibold text-base mb-1">{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{job.description}</p>
                    <p className="text-xs text-muted-foreground">{job.location} · {formatRelativeTime(job.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-2">
                    <p className="text-lg font-bold text-primary">{formatCurrency(job.budget)}</p>
                    <div className="flex gap-2 flex-col">
                      <Button
                        size="sm"
                        className="gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white text-xs h-8 px-3"
                        onClick={() => navigate(`/jobs/${job.id}/brain`)}
                      >
                        <Brain className="h-3.5 w-3.5" /> Brain
                        <Zap className="h-3 w-3 text-yellow-300" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => navigate(`/jobs/${job.id}`)}>Detail</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
