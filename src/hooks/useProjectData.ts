import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type CostCenter = Database['public']['Tables']['cost_centers']['Row'];

export function useProjectData(projectId: string | null) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setContracts([]);
      setCostCenters([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      const [contractsRes, costCentersRes] = await Promise.all([
        supabase.from('contracts').select('*').eq('project_id', projectId),
        supabase.from('cost_centers').select('*').eq('project_id', projectId),
      ]);

      setContracts(contractsRes.data || []);
      setCostCenters(costCentersRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, [projectId]);

  return { contracts, costCenters, loading };
}
