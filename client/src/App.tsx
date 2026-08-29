import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingChatbot from "@/components/FloatingChatbot";
import DatabaseStatusBanner from "@/components/DatabaseStatusBanner";
import { useUser } from "@/hooks/useUser";

// Keep the initial desktop shell small. Each page loads only when its route is visited.
const HomePage = lazy(() => import("@/pages/Home"));
const AuthPage = lazy(() => import("@/pages/Auth"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const JobsPage = lazy(() => import("@/pages/Jobs"));
const JobCreate = lazy(() => import("@/pages/JobCreate"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const ExpertsPage = lazy(() => import("@/pages/Experts"));
const ExpertDetail = lazy(() => import("@/pages/ExpertDetail"));
const ContractsPage = lazy(() => import("@/pages/Contracts"));
const ContractDetail = lazy(() => import("@/pages/ContractDetail"));
const DisputesPage = lazy(() => import("@/pages/Disputes"));
const ProfileEdit = lazy(() => import("@/pages/ProfileEdit"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const CostEstimator = lazy(() => import("@/pages/CostEstimator"));
const Chatbot = lazy(() => import("@/pages/Chatbot"));
const AdminPage = lazy(() => import("@/pages/Admin"));
const OnboardingPage = lazy(() => import("@/pages/Onboarding"));
const StudyMaterials = lazy(() => import("@/pages/StudyMaterials"));
const CompetencyTest = lazy(() => import("@/pages/CompetencyTest"));
const MyJobs = lazy(() => import("@/pages/MyJobs"));
const BrainProject = lazy(() => import("@/pages/BrainProject"));
const BrainContract = lazy(() => import("@/pages/BrainContract"));
const JobBoard = lazy(() => import("@/pages/JobBoard"));
const Klinika = lazy(() => import("@/pages/Klinika"));
const Bimtek = lazy(() => import("@/pages/Bimtek"));

const NotFound = lazy(() => import("@/pages/NotFound"));

const NO_NAV_ROUTES = ["/login", "/register", "/onboarding"];
const NO_FOOTER_ROUTES = ["/login", "/register", "/onboarding", "/chatbot"];

function RouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm text-muted-foreground">Memuat halaman...</span>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const { data: user, isLoading, isError, error, refetch } = useUser();

  useEffect(() => {
    if (!isLoading && !isError && !user) {
      navigate("/login?error=session_expired");
    }
  }, [isError, isLoading, navigate, user]);

  if (isLoading) return <RouteLoading />;

  if (isError) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold">Sesi belum dapat diverifikasi</p>
        <p className="text-sm text-muted-foreground mt-2">
          Layanan sedang mengalami gangguan. Coba lagi sebentar.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

export default function App() {
  const [location] = useLocation();
  const showNav = !NO_NAV_ROUTES.includes(location);
  const showFooter = !NO_FOOTER_ROUTES.includes(location);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showNav && <Navbar />}
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
                <span className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Memuat halaman...
              </div>
            </div>
          }
        >
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={() => <AuthPage mode="login" />} />
            <Route path="/register" component={() => <AuthPage mode="register" />} />
            <Route path="/onboarding" component={OnboardingPage} />
            <Route
              path="/dashboard"
              component={() => (
                <ProtectedPage>
                  <Dashboard />
                </ProtectedPage>
              )}
            />
            <Route path="/jobs/create" component={JobCreate} />
            <Route path="/jobs/:id/brain" component={BrainProject} />
            <Route path="/jobs/:id" component={JobDetail} />
            <Route path="/jobs" component={JobsPage} />
            <Route path="/my-jobs" component={MyJobs} />
            <Route path="/experts/:userId" component={ExpertDetail} />
            <Route path="/experts" component={ExpertsPage} />
            <Route path="/contracts/:id/brain" component={BrainContract} />
            <Route path="/contracts/:id" component={ContractDetail} />
            <Route path="/contracts" component={ContractsPage} />
            <Route path="/disputes" component={DisputesPage} />
            <Route path="/profile/edit" component={ProfileEdit} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/cost-estimator" component={CostEstimator} />
            <Route path="/chatbot" component={Chatbot} />
            <Route path="/admin" component={AdminPage} />
            <Route path="/study-materials" component={StudyMaterials} />
            <Route path="/competency-test" component={CompetencyTest} />
            <Route path="/job-board" component={JobBoard} />
            <Route path="/klinika" component={Klinika} />
            <Route path="/bimtek" component={Bimtek} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </main>
      {showFooter && <Footer />}
      <FloatingChatbot />
      <DatabaseStatusBanner />
      <Toaster />
    </div>
  );
}
