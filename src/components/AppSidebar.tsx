import { LayoutDashboard, FileText, BookOpen, Building2, ShieldCheck, Map, HelpCircle } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ContractorInstructionsModal } from "@/components/ContractorInstructionsModal";
import { SupportHelpModal } from "@/components/SupportHelpModal";
import { useEstimationStore } from "@/lib/estimationStore";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Aprobaciones", url: "/aprobaciones", icon: FileText },
  { title: "Mis Estimaciones", url: "/estimaciones", icon: FileText },
  { title: "Catálogo de Conceptos", url: "/conceptos", icon: BookOpen },
  { title: "Centros de Costos", url: "/centros-costos", icon: Building2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { currentRole } = useEstimationStore();
  const [isSupport, setIsSupport] = useState(false);
  const [isContractorDb, setIsContractorDb] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const collapsed = state === "collapsed";

  // Show instructions if demo role is contratista OR if user has contratista role in DB
  const showContractorInstructions = currentRole === 'contratista' || isContractorDb;
  
  // Show help button for all roles EXCEPT soporte_tecnico
  const showHelpButton = currentRole !== 'soporte_tecnico';

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;

      const { data: supportData } = await supabase
        .from('project_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'soporte_tecnico')
        .maybeSingle();
      setIsSupport(!!supportData);

      const { data: contractorData } = await supabase
        .from('project_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'contratista')
        .maybeSingle();
      setIsContractorDb(!!contractorData);
    };
    checkRole();
  }, [user]);

  const items: any[] = [...menuItems];

  // Add Instructions for Contractor (demo role or real DB role)
  if (showContractorInstructions) {
    items.push({
      title: "INSTRUCCIONES",
      action: () => setShowInstructionsModal(true),
      icon: Map,
      className: "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
    });
  }

  // Add Help button for all roles except soporte_tecnico
  if (showHelpButton) {
    items.push({
      title: "AYUDA",
      action: () => setShowHelpModal(true),
      icon: HelpCircle,
      className: "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
    });
  }

  // Add Supervision for Support
  if (isSupport) {
      items.push({ title: "Supervisión", url: "/support-dashboard", icon: ShieldCheck });
  }

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar">
        <SidebarContent className="bg-sidebar">
          <div className="px-4 py-6">
            <h1 className={`font-bold text-sidebar-foreground transition-all ${collapsed ? "text-sm text-center" : "text-xl"}`}>
              {collapsed ? "GS" : "Grupo Salazar"}
            </h1>
          </div>

          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              {collapsed ? "·" : "Navegación"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.action}
                      onClick={item.action}
                      className={item.className}
                    >
                      {item.action ? (
                        <div className="flex items-center gap-2 cursor-pointer w-full">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </div>
                      ) : (
                        <NavLink
                          to={item.url}
                          end
                          activeClassName="bg-primary text-primary-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <ContractorInstructionsModal
        open={showInstructionsModal}
        onOpenChange={setShowInstructionsModal}
      />

      <SupportHelpModal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
      />
    </>
  );
}
