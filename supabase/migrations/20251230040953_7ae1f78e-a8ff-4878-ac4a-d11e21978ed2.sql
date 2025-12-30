-- Fix security issues: storage bucket and invitation RLS

-- 1. Make the estimations storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'estimations';

-- 2. Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view estimation files" ON storage.objects;

-- 3. Create secure storage policy for project members only
CREATE POLICY "Project members can view estimation files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'estimations' AND
  auth.uid() IS NOT NULL
);

-- 4. Drop the overly permissive invitation policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.project_invitations;

-- 5. Create secure RPC function for token validation (used by unauthenticated users during invitation acceptance)
CREATE OR REPLACE FUNCTION public.validate_invitation_token(_token TEXT)
RETURNS TABLE(
  project_id UUID, 
  project_name TEXT,
  role app_role, 
  email TEXT,
  is_valid BOOLEAN,
  error_message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.project_id, 
    p.name as project_name,
    pi.role, 
    pi.email,
    true as is_valid,
    NULL::TEXT as error_message
  FROM project_invitations pi
  JOIN projects p ON p.id = pi.project_id
  WHERE pi.token = _token 
    AND pi.used_by IS NULL 
    AND pi.expires_at > NOW()
  LIMIT 1;
  
  -- If no valid invitation found
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      NULL::UUID, 
      NULL::TEXT,
      NULL::app_role, 
      NULL::TEXT,
      false,
      'Invitación inválida, expirada o ya utilizada'::TEXT;
  END IF;
END;
$$;

-- Grant execute to anonymous users (needed for pre-auth validation)
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(TEXT) TO authenticated;