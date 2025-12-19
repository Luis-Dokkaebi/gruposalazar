import { LayoutDashboard, FileText, BookOpen, Building2, ShieldCheck } from "lucide-react";
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
  const [isSupport, setIsSupport] = useState(false);
  const collapsed = state === "collapsed";

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('project_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'soporte_tecnico')
        .maybeSingle();
      setIsSupport(!!data);
    };
    checkRole();
  }, [user]);

  const items = [...menuItems];
  if (isSupport) {
      items.push({ title: "Supervisión", url: "/support-dashboard", icon: ShieldCheck });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
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
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-white/5 transition-colors"
                      activeClassName="bg-white/10 text-sidebar-primary font-medium border-l-4 border-sidebar-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
