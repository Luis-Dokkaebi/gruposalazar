import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { RoleSelector } from "@/components/RoleSelector";
import { ProjectSelector } from "@/components/ProjectSelector";
import { Footer } from "@/components/Footer";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import Dashboard from "./pages/Dashboard";
import Aprobaciones from "./pages/Aprobaciones";
import Estimaciones from "./pages/Estimaciones";
import Conceptos from "./pages/Conceptos";
import CentrosCostos from "./pages/CentrosCostos";
import Auth from "./pages/Auth";
import AcceptInvitation from "./pages/AcceptInvitation";
import SupportDashboard from "./pages/SupportDashboard";
import { SupportRoute } from "./components/SupportRoute";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Main layout with sidebar
function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <ProjectSelector />
              </div>
              <RoleSelector />
            </header>
            <main className="flex-1 p-4 md:p-8 overflow-auto bg-main-background">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    </ProjectProvider>
  );
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/invite" element={<AcceptInvitation />} />
    
    {/* Protected routes with main layout */}
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/aprobaciones"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Aprobaciones />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/estimaciones"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Estimaciones />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/conceptos"
      element={
        <ProtectedRoute>
          <MainLayout>
            <Conceptos />
          </MainLayout>
        </ProtectedRoute>
      }
    />
    <Route
      path="/centros-costos"
      element={
        <ProtectedRoute>
          <MainLayout>
            <CentrosCostos />
          </MainLayout>
        </ProtectedRoute>
      }
    />

    {/* Support Route */}
    <Route element={<SupportRoute />}>
      <Route path="/support-dashboard" element={<MainLayout><SupportDashboard /></MainLayout>} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  useEffect(() => {
    const handleInteraction = () => {
      // Request fullscreen on first click
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log("Error attempting to enable full-screen mode:", err.message);
        });
      }
    };

    // Listen for the first click to trigger fullscreen
    document.addEventListener("click", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="antialiased min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
