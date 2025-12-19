-- Allow support users to update roles in project_members
-- Note: Supabase policies are permissive by default for owners, but we need explicit permission for Support role

-- First, ensure RLS is enabled
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Policy for Support to UPDATE project_members
CREATE POLICY "Support can update project members"
ON public.project_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
);
