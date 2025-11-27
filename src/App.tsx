import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { RoleSelector } from "@/components/RoleSelector";
import { Footer } from "@/components/Footer";
import Dashboard from "./pages/Dashboard";
import Aprobaciones from "./pages/Aprobaciones";
import Estimaciones from "./pages/Estimaciones";
import Conceptos from "./pages/Conceptos";
import CentrosCostos from "./pages/CentrosCostos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                </div>
                <RoleSelector />
              </header>
              <main className="flex-1 p-6 md:p-8 overflow-auto bg-main-background">
                <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/aprobaciones" element={<Aprobaciones />} />
                <Route path="/estimaciones" element={<Estimaciones />} />
                <Route path="/conceptos" element={<Conceptos />} />
                <Route path="/centros-costos" element={<CentrosCostos />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
                </div>
              </main>
              <Footer />
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
