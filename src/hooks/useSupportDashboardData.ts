import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type Estimation = Database['public']['Tables']['estimations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type ProjectMember = Database['public']['Tables']['project_members']['Row'];

export interface ProjectStats extends Project {
  totalEstimationAmount: number;
  activeEstimationsCount: number;
  status: 'Active' | 'Finished' | 'New';
  leader: Profile | null;
  lastActivity: string | null;
}

export interface UserWorkload {
  userId: string;
  userName: string;
  projectCount: number;
  pendingEstimationsCount: number;
}

export function useSupportDashboardData() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectStats[]>([]);
  const [workload, setWorkload] = useState<UserWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all projects with estimations and members
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          estimations (
            id,
            amount,
            status,
            updated_at,
            created_at
          ),
          project_members (
            role,
            user_id,
            profiles (
              id,
              full_name,
              email
            )
          )
        `);

      if (projectsError) throw projectsError;

      // 2. Process Projects Data
      const processedProjects: ProjectStats[] = (projectsData || []).map((project: any) => {
        const estimations = project.estimations || [];
        const members = project.project_members || [];

        // Calculate totals
        const totalAmount = estimations.reduce((sum: number, est: any) => sum + (est.amount || 0), 0);

        // Determine status
        // Active: Has estimations that are NOT 'paid'
        // Finished: Has estimations AND all are 'paid'
        // New: No estimations
        const hasEstimations = estimations.length > 0;
        const allPaid = hasEstimations && estimations.every((e: any) => e.status === 'paid');
        const hasActive = hasEstimations && estimations.some((e: any) => e.status !== 'paid');

        let status: 'Active' | 'Finished' | 'New' = 'New';
        if (hasActive) status = 'Active';
        else if (allPaid) status = 'Finished';

        // Find Leader
        const leaderMember = members.find((m: any) => m.role === 'lider_proyecto');
        const leader = leaderMember ? leaderMember.profiles : null;

        // Last Activity
        const lastEst = estimations.sort((a: any, b: any) =>
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
        )[0];
        const lastActivity = lastEst ? (lastEst.updated_at || lastEst.created_at) : project.updated_at;

        return {
          ...project,
          totalEstimationAmount: totalAmount,
          activeEstimationsCount: estimations.filter((e: any) => e.status !== 'paid').length,
          status,
          leader,
          lastActivity
        };
      });

      setProjects(processedProjects);

      // 3. Process Workload Data
      // Map user ID to workload stats
      const workloadMap = new Map<string, UserWorkload>();

      (projectsData || []).forEach((project: any) => {
        const members = project.project_members || [];
        const estimations = project.estimations || [];
        const activeEstimations = estimations.filter((e: any) => e.status !== 'paid').length;

        members.forEach((member: any) => {
           if (!member.profiles) return;
           const userId = member.user_id;

           if (!workloadMap.has(userId)) {
             workloadMap.set(userId, {
               userId,
               userName: member.profiles.full_name || member.profiles.email,
               projectCount: 0,
               pendingEstimationsCount: 0
             });
           }

           const stats = workloadMap.get(userId)!;
           stats.projectCount += 1;
           // Roughly attribute pending estimations to everyone in the project?
           // Or strictly to the assignee?
           // Requirement: "user with too many projects assigned"
           // Let's stick to project count for now as per requirement example.
           // And maybe pending estimations if they are the leader?

           if (member.role === 'lider_proyecto') {
               stats.pendingEstimationsCount += activeEstimations;
           }
        });
      });

      setWorkload(Array.from(workloadMap.values()).sort((a, b) => b.projectCount - a.projectCount));

    } catch (err: any) {
      console.error("Error fetching support dashboard data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    projects,
    workload,
    loading,
    error,
    refetch: fetchData
  };
}
