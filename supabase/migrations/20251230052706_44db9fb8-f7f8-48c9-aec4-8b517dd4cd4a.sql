
-- Fix: La función debe devolver el status que indica que el paso anterior terminó,
-- no el status del siguiente aprobador completado.
-- auth_resident = residente terminó, superintendente debe aprobar
-- auth_super = super terminó, líder debe aprobar

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
  
  -- Logic: each status represents "this role has approved/completed"
  -- So we need to find the NEXT role that needs to approve
  CASE _current_status
    -- registered: need to find first active approver
    WHEN 'registered' THEN
      -- If resident is active, they need to approve -> move to auth_resident when done
      IF est_rec.is_resident_active THEN 
        RETURN 'auth_resident';
      -- If resident inactive but super active, skip to auth_resident (resident done), super approves next
      ELSIF est_rec.is_superintendent_active THEN 
        RETURN 'auth_resident';
      -- If both inactive but leader active, skip to auth_super (super done), leader approves next  
      ELSIF est_rec.is_leader_active THEN 
        RETURN 'auth_super';
      -- All field roles inactive, go directly to compras
      ELSE 
        RETURN 'validated_compras';
      END IF;
      
    -- auth_resident: resident approved, find next
    WHEN 'auth_resident' THEN
      IF est_rec.is_superintendent_active THEN 
        RETURN 'auth_super';
      ELSIF est_rec.is_leader_active THEN 
        RETURN 'auth_leader';
      ELSE 
        RETURN 'validated_compras';
      END IF;
      
    -- auth_super: super approved, find next
    WHEN 'auth_super' THEN
      IF est_rec.is_leader_active THEN 
        RETURN 'auth_leader';
      ELSE 
        RETURN 'validated_compras';
      END IF;
      
    -- auth_leader: leader approved, go to compras
    WHEN 'auth_leader' THEN
      RETURN 'validated_compras';
      
    -- validated_compras: wait for invoice
    WHEN 'validated_compras' THEN
      RETURN 'factura_subida';
      
    -- factura_subida: go to finanzas
    WHEN 'factura_subida' THEN
      RETURN 'validated_finanzas';
      
    -- validated_finanzas: go to paid
    WHEN 'validated_finanzas' THEN
      RETURN 'paid';
      
    ELSE
      RETURN _current_status;
  END CASE;
END;
$function$;
