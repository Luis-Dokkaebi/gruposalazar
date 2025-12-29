-- Add role configuration columns to estimations table
ALTER TABLE public.estimations
ADD COLUMN is_resident_active boolean NOT NULL DEFAULT true,
ADD COLUMN is_superintendent_active boolean NOT NULL DEFAULT true,
ADD COLUMN is_leader_active boolean NOT NULL DEFAULT true;

-- Update get_next_approval_status to use estimation config instead of project
CREATE OR REPLACE FUNCTION public.get_next_approval_status(_project_id uuid, _current_status estimation_status)
 RETURNS estimation_status
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  est_rec RECORD;
BEGIN
  -- This function is kept for backwards compatibility but the new overload with estimation_id should be preferred
  CASE _current_status
    WHEN 'registered' THEN RETURN 'auth_resident';
    WHEN 'auth_resident' THEN RETURN 'auth_super';
    WHEN 'auth_super' THEN RETURN 'auth_leader';
    WHEN 'auth_leader' THEN RETURN 'validated_compras';
    WHEN 'validated_compras' THEN RETURN 'factura_subida';
    WHEN 'factura_subida' THEN RETURN 'validated_finanzas';
    WHEN 'validated_finanzas' THEN RETURN 'paid';
    ELSE RETURN _current_status;
  END CASE;
END;
$function$;

-- Create new overload that uses estimation_id
CREATE OR REPLACE FUNCTION public.get_next_approval_status_by_estimation(_estimation_id uuid, _current_status estimation_status)
 RETURNS estimation_status
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  est_rec RECORD;
BEGIN
  -- Get estimation role configuration
  SELECT is_resident_active, is_superintendent_active, is_leader_active
  INTO est_rec
  FROM public.estimations
  WHERE id = _estimation_id;
  
  -- Logic based on current status and active roles
  CASE _current_status
    -- Initial state: find first active approver
    WHEN 'registered' THEN
      IF est_rec.is_resident_active THEN RETURN 'auth_resident';
      ELSIF est_rec.is_superintendent_active THEN RETURN 'auth_super';
      ELSIF est_rec.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- After resident: find next active
    WHEN 'auth_resident' THEN
      IF est_rec.is_superintendent_active THEN RETURN 'auth_super';
      ELSIF est_rec.is_leader_active THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- After super: find next active
    WHEN 'auth_super' THEN
      IF est_rec.is_leader_active THEN RETURN 'auth_leader';
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