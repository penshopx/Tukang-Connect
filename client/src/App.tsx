import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HomePage from "@/pages/Home";
import AuthPage from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import JobsPage from "@/pages/Jobs";
import JobCreate from "@/pages/JobCreate";
import JobDetail from "@/pages/JobDetail";
import ExpertsPage from "@/pages/Experts";
import ExpertDetail from "@/pages/ExpertDetail";
import ContractsPage from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";
import DisputesPage from "@/pages/Disputes";
import ProfileEdit from "@/pages/ProfileEdit";
import Portfolio from "@/pages/Portfolio";
import CostEstimator from "@/pages/CostEstimator";
import Chatbot from "@/pages/Chatbot";
import AdminPage from "@/pages/Admin";
import OnboardingPage from "@/pages/Onboarding";
import StudyMaterials from "@/pages/StudyMaterials";
import CompetencyTest from "@/pages/CompetencyTest";
import MyJobs from "@/pages/MyJobs";
import BrainProject from "@/pages/BrainProject";
import BrainContract from "@/pages/BrainContract";
import JobBoard from "@/pages/JobBoard";
import Klinika from "@/pages/Klinika";
import Bimtek from "@/pages/Bimtek";
import NotFound from "@/pages/NotFound";
import FloatingChatbot from "@/components/FloatingChatbot";

const NO_NAV_ROUTES = ["/login", "/register", "/onboarding"];
const NO_FOOTER_ROUTES = ["/login", "/register", "/onboarding", "/chatbot"];

export default function App() {
  const [location] = useLocation();
  const showNav = !NO_NAV_ROUTES.includes(location);
  const showFooter = !NO_FOOTER_ROUTES.includes(location);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showNav && <Navbar />}
      <main className="flex-1">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/login" component={() => <AuthPage mode="login" />} />
          <Route path="/register" component={() => <AuthPage mode="register" />} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/dashboard" component={Dashboard} />
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
      </main>
      {showFooter && <Footer />}
      <FloatingChatbot />
      <Toaster />
    </div>
  );
}
