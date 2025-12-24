-- Add role configuration columns to estimations table
ALTER TABLE public.estimations
ADD COLUMN is_resident_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN is_superintendent_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN is_leader_active BOOLEAN NOT NULL DEFAULT true;

-- Migrate existing data: Copy configuration from projects to estimations
UPDATE public.estimations e
SET
  is_resident_active = p.is_resident_active,
  is_superintendent_active = p.is_superintendent_active,
  is_leader_active = p.is_leader_active
FROM public.projects p
WHERE e.project_id = p.id;

-- Update get_next_approval_status to use estimation_id and read from estimations table
CREATE OR REPLACE FUNCTION public.get_next_approval_status(
  _estimation_id UUID,
  _current_status estimation_status
)
RETURNS estimation_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  est_config RECORD;
BEGIN
  -- Get estimation role configuration
  SELECT is_resident_active, is_superintendent_active, is_leader_active
  INTO est_config
  FROM public.estimations
  WHERE id = _estimation_id;

  -- Logic based on current status and active roles
  CASE _current_status
    -- Initial state: find first active approver
    WHEN 'registered' THEN
      IF est_config.is_resident_active THEN RETURN 'auth_resident';
      ELSIF est_config.is_superintendent_active THEN RETURN 'auth_super';
      ELSIF est_config.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;

    -- After resident: find next active
    WHEN 'auth_resident' THEN
      IF est_config.is_superintendent_active THEN RETURN 'auth_super';
      ELSIF est_config.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;

    -- After super: find next active
    WHEN 'auth_super' THEN
      IF est_config.is_leader_active THEN RETURN 'auth_leader';
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
$$;

-- Update get_skipped_roles_for_signing to use estimation_id
CREATE OR REPLACE FUNCTION public.get_skipped_roles_for_signing(
  _estimation_id UUID,
  _current_status estimation_status,
  _target_status estimation_status
)
RETURNS TABLE(role_name TEXT, status_key estimation_status)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  est_config RECORD;
  status_order TEXT[] := ARRAY['registered', 'auth_resident', 'auth_super', 'auth_leader', 'validated_compras'];
  current_idx INT;
  target_idx INT;
  i INT;
BEGIN
  -- Get estimation role configuration
  SELECT is_resident_active, is_superintendent_active, is_leader_active
  INTO est_config
  FROM public.estimations
  WHERE id = _estimation_id;

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
        IF NOT est_config.is_resident_active THEN
          role_name := 'residente';
          status_key := 'auth_resident'::estimation_status;
          RETURN NEXT;
        END IF;
      WHEN 'auth_super' THEN
        IF NOT est_config.is_superintendent_active THEN
          role_name := 'superintendente';
          status_key := 'auth_super'::estimation_status;
          RETURN NEXT;
        END IF;
      WHEN 'auth_leader' THEN
        IF NOT est_config.is_leader_active THEN
          role_name := 'lider_proyecto';
          status_key := 'auth_leader'::estimation_status;
          RETURN NEXT;
        END IF;
      ELSE
        NULL;
    END CASE;
  END LOOP;
END;
$$;

-- Policy to allow update of these fields
CREATE POLICY "Project members can update estimation config"
ON public.estimations FOR UPDATE
USING (public.is_project_member(auth.uid(), project_id));
