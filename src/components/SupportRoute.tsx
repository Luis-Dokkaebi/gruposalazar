import { useAuth } from "@/contexts/AuthContext";
import { useUserProjects } from "@/hooks/useUserProjects";
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SupportRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const [isSupport, setIsSupport] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('project_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'soporte_tecnico')
          .maybeSingle();

        if (error) throw error;
        setIsSupport(!!data);
      } catch (error) {
        console.error("Error checking support role:", error);
        setIsSupport(false);
      } finally {
        setCheckingRole(false);
      }
    };

    if (!authLoading) {
      checkRole();
    }
  }, [user, authLoading]);

  if (authLoading || checkingRole) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!user || !isSupport) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
