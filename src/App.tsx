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
import { ProjectProvider, useProject } from "@/contexts/ProjectContext";
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
import { OperationalLayout } from "@/layouts/OperationalLayout";
import ResidenteDashboard from "@/pages/dashboards/ResidenteDashboard";
import SuperintendenteDashboard from "@/pages/dashboards/SuperintendenteDashboard";
import LiderProyectoDashboard from "@/pages/dashboards/LiderProyectoDashboard";
import ComprasDashboard from "@/pages/dashboards/ComprasDashboard";
import FinanzasDashboard from "@/pages/dashboards/FinanzasDashboard";
import PagosDashboard from "@/pages/dashboards/PagosDashboard";

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

// Require Support Role Wrapper
function RequireSupport({ children }: { children: React.ReactNode }) {
  const { userRoles, loading } = useProject();

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Allow access if support role is present
  if (userRoles.includes('soporte_tecnico')) {
    return <>{children}</>;
  }

  // Otherwise redirect to home (which will route to their specific dashboard)
  return <Navigate to="/" replace />;
}

// Main layout with sidebar (For Support/Admin)
function MainLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}

function RoleBasedHome() {
  const { userRoles, loading } = useProject();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRoles.includes('soporte_tecnico')) {
    return <MainLayout><Dashboard /></MainLayout>;
  }

  if (userRoles.includes('residente')) return <OperationalLayout><ResidenteDashboard /></OperationalLayout>;
  if (userRoles.includes('superintendente')) return <OperationalLayout><SuperintendenteDashboard /></OperationalLayout>;
  if (userRoles.includes('lider_proyecto')) return <OperationalLayout><LiderProyectoDashboard /></OperationalLayout>;
  if (userRoles.includes('compras')) return <OperationalLayout><ComprasDashboard /></OperationalLayout>;
  if (userRoles.includes('finanzas')) return <OperationalLayout><FinanzasDashboard /></OperationalLayout>;
  if (userRoles.includes('pagos')) return <OperationalLayout><PagosDashboard /></OperationalLayout>;

  // Fallback for users with no specific role or unhandled roles (e.g. contratista if not excluded properly)
  // For now, default to MainLayout Dashboard or a "No Access" page.
  // Given instructions, "Contratista" is excluded from this refactor, so we leave it as is (MainLayout or whatever it was).
  // If user has NO roles, they might see an empty dashboard or just the MainLayout.
  return <MainLayout><Dashboard /></MainLayout>;
}

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/auth" element={<Auth />} />
    <Route path="/invite" element={<AcceptInvitation />} />
    
    {/* Root Route - Dispatches based on Role */}
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <RoleBasedHome />
        </ProtectedRoute>
      }
    />

    {/* Support Routes - Protected & Restricted */}
    <Route
      path="/aprobaciones"
      element={
        <ProtectedRoute>
          <RequireSupport>
            <MainLayout>
              <Aprobaciones />
            </MainLayout>
          </RequireSupport>
        </ProtectedRoute>
      }
    />
    <Route
      path="/estimaciones"
      element={
        <ProtectedRoute>
          <RequireSupport>
             <MainLayout>
              <Estimaciones />
            </MainLayout>
          </RequireSupport>
        </ProtectedRoute>
      }
    />
    <Route
      path="/conceptos"
      element={
        <ProtectedRoute>
          <RequireSupport>
            <MainLayout>
              <Conceptos />
            </MainLayout>
          </RequireSupport>
        </ProtectedRoute>
      }
    />
    <Route
      path="/centros-costos"
      element={
        <ProtectedRoute>
          <RequireSupport>
             <MainLayout>
              <CentrosCostos />
            </MainLayout>
          </RequireSupport>
        </ProtectedRoute>
      }
    />

    {/* Support Dashboard Specific Route */}
    <Route element={<SupportRoute />}>
      <Route path="/support-dashboard" element={<MainLayout><SupportDashboard /></MainLayout>} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="antialiased min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-primary-foreground">
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
               <AppRoutes />
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
