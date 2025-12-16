-- Add 'soporte' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'soporte';

-- Add configuration columns to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS config_requires_resident BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS config_requires_superintendent BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS config_requires_leader BOOLEAN DEFAULT true;

-- Update get_next_approval_status to respect configuration
CREATE OR REPLACE FUNCTION public.get_next_approval_status(
  _project_id UUID,
  _current_status estimation_status
)
RETURNS estimation_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_roles app_role[];
  project_config RECORD;
  has_residente BOOLEAN;
  has_super BOOLEAN;
  has_lider BOOLEAN;

  -- Function to check if a status needs to be approved by a required role
  -- If not required, we skip it.
  -- But we return the status that *results* from that step.
BEGIN
  -- Get project roles
  SELECT COALESCE(get_project_roles(_project_id), ARRAY[]::app_role[]) INTO project_roles;

  -- Get project configuration
  SELECT
    config_requires_resident,
    config_requires_superintendent,
    config_requires_leader
  INTO project_config
  FROM public.projects
  WHERE id = _project_id;

  -- Check availability: A role is available if it exists in the project AND is required by config
  has_residente := ('residente' = ANY(project_roles)) AND (project_config.config_requires_resident IS NOT FALSE);
  has_super := ('superintendente' = ANY(project_roles)) AND (project_config.config_requires_superintendent IS NOT FALSE);
  has_lider := ('lider_proyecto' = ANY(project_roles)) AND (project_config.config_requires_leader IS NOT FALSE);

  -- We need to find the next *stop*.
  -- If we are at 'registered', we are waiting for Resident.
  -- If Resident is skipped, we are effectively at 'auth_resident', waiting for Super.
  -- If Super is skipped, we are effectively at 'auth_super', waiting for Leader.

  -- But this function is called to transition FROM current.
  -- So if input is 'registered', we calculate where we land.

  IF _current_status = 'registered' THEN
     IF has_residente THEN RETURN 'auth_resident'; END IF;
     -- Resident skipped, simulate starting from 'auth_resident'
     _current_status := 'auth_resident';
  END IF;

  IF _current_status = 'auth_resident' THEN
     IF has_super THEN RETURN 'auth_super'; END IF;
     _current_status := 'auth_super';
  END IF;

  IF _current_status = 'auth_super' THEN
     IF has_lider THEN RETURN 'auth_leader'; END IF;
     _current_status := 'auth_leader';
  END IF;

  IF _current_status = 'auth_leader' THEN
     RETURN 'validated_compras';
  END IF;

  IF _current_status = 'validated_compras' THEN
     RETURN 'factura_subida';
  END IF;

  IF _current_status = 'factura_subida' THEN
      RETURN 'validated_finanzas';
  END IF;

  IF _current_status = 'validated_finanzas' THEN
      RETURN 'paid';
  END IF;

  RETURN _current_status;
END;
$$;
