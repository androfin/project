import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Presentations from "@/pages/presentations";
import PresentationViewer from "@/pages/presentation-viewer";
import Labs from "@/pages/labs";
import LabExercise from "@/pages/lab-exercise";
import Quizzes from "@/pages/quizzes";
import Quiz from "@/pages/quiz";
import Leaderboard from "@/pages/leaderboard";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin-dashboard";
import Documentation from "@/pages/documentation";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Presentations} />
      <Route path="/presentations" component={Presentations} />
      <Route path="/presentations/:topicId" component={PresentationViewer} />
      <Route path="/quizzes" component={Quizzes} />
      <Route path="/quizzes/:topicId" component={Quiz} />
      <Route path="/labs" component={Labs} />
      <Route path="/labs/:topicId" component={LabExercise} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/docs" component={Documentation} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isAuthenticated && !isLoading) {
    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-3 border-b border-border bg-background z-50 sticky top-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-y-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <header className="flex items-center justify-end p-3 border-b border-border bg-background z-50">
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-y-auto">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
