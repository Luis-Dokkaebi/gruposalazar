-- Add role configuration columns to projects table
ALTER TABLE public.projects 
ADD COLUMN is_resident_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN is_superintendent_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN is_leader_active BOOLEAN NOT NULL DEFAULT true;

-- Add columns to estimations to track who signed on behalf of inactive roles
ALTER TABLE public.estimations
ADD COLUMN resident_signed_by TEXT DEFAULT NULL,
ADD COLUMN superintendent_signed_by TEXT DEFAULT NULL,
ADD COLUMN leader_signed_by TEXT DEFAULT NULL;

-- Update the get_next_approval_status function to consider active roles
CREATE OR REPLACE FUNCTION public.get_next_approval_status(_project_id uuid, _current_status estimation_status)
 RETURNS estimation_status
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
BEGIN
  -- Get project role configuration
  SELECT is_resident_active, is_superintendent_active, is_leader_active
  INTO project_rec
  FROM public.projects
  WHERE id = _project_id;
  
  -- Logic based on current status and active roles
  CASE _current_status
    -- Initial state: find first active approver
    WHEN 'registered' THEN
      IF project_rec.is_resident_active THEN RETURN 'auth_resident';
      ELSIF project_rec.is_superintendent_active THEN RETURN 'auth_super';
      ELSIF project_rec.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- After resident: find next active
    WHEN 'auth_resident' THEN
      IF project_rec.is_superintendent_active THEN RETURN 'auth_super';
      ELSIF project_rec.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- After super: find next active
    WHEN 'auth_super' THEN
      IF project_rec.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- After leader: always go to compras
    WHEN 'auth_leader' THEN
      RETURN 'validated_compras';
      
    -- After compras: wait for invoice
    WHEN 'validated_compras' THEN
      RETURN 'factura_subida';
      
    -- After invoice: go to finanzas
    WHEN 'factura_subida' THEN
      RETURN 'validated_finanzas';
      
    -- After finanzas: go to paid
    WHEN 'validated_finanzas' THEN
      RETURN 'paid';
      
    ELSE
      RETURN _current_status;
  END CASE;
END;
$function$;

-- Create function to get which roles are skipped and should be auto-signed
CREATE OR REPLACE FUNCTION public.get_skipped_roles_for_signing(
  _project_id uuid, 
  _current_status estimation_status,
  _target_status estimation_status
)
RETURNS TABLE(role_name TEXT, status_key estimation_status)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  project_rec RECORD;
  status_order TEXT[] := ARRAY['registered', 'auth_resident', 'auth_super', 'auth_leader', 'validated_compras'];
  current_idx INT;
  target_idx INT;
  i INT;
BEGIN
  -- Get project role configuration
  SELECT is_resident_active, is_superintendent_active, is_leader_active
  INTO project_rec
  FROM public.projects
  WHERE id = _project_id;
  
  -- Find indices
  current_idx := array_position(status_order, _current_status::TEXT);
  target_idx := array_position(status_order, _target_status::TEXT);
  
  IF current_idx IS NULL OR target_idx IS NULL THEN
    RETURN;
  END IF;
  
  -- Iterate through statuses between current and target
  FOR i IN (current_idx + 1)..(target_idx - 1) LOOP
    CASE status_order[i]
      WHEN 'auth_resident' THEN
        IF NOT project_rec.is_resident_active THEN
          role_name := 'residente';
          status_key := 'auth_resident'::estimation_status;
          RETURN NEXT;
        END IF;
      WHEN 'auth_super' THEN
        IF NOT project_rec.is_superintendent_active THEN
          role_name := 'superintendente';
          status_key := 'auth_super'::estimation_status;
          RETURN NEXT;
        END IF;
      WHEN 'auth_leader' THEN
        IF NOT project_rec.is_leader_active THEN
          role_name := 'lider_proyecto';
          status_key := 'auth_leader'::estimation_status;
          RETURN NEXT;
        END IF;
      ELSE
        NULL;
    END CASE;
  END LOOP;
END;
$function$;

-- Create RLS policy for project updates (support can update role configuration)
CREATE POLICY "Support can update project roles" 
ON public.projects 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = projects.id 
      AND pm.user_id = auth.uid() 
      AND pm.role = 'soporte_tecnico'
  )
  OR created_by = auth.uid()
);