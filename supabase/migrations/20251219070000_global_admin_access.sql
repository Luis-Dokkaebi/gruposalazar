-- Function to check for global admin email
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email') = 'armandoag_1996@hotmail.com'
$$;

-- Projects
DROP POLICY IF EXISTS "Project members can view projects" ON public.projects;
CREATE POLICY "Project members can view projects"
ON public.projects FOR SELECT
USING (public.is_global_admin() OR public.is_project_member(auth.uid(), id) OR created_by = auth.uid());

-- Project Members
DROP POLICY IF EXISTS "Project members can view other members" ON public.project_members;
CREATE POLICY "Project members can view other members"
ON public.project_members FOR SELECT
USING (public.is_global_admin() OR public.is_project_member(auth.uid(), project_id));

-- Estimations
DROP POLICY IF EXISTS "Project members can view estimations" ON public.estimations;
CREATE POLICY "Project members can view estimations"
ON public.estimations FOR SELECT
USING (public.is_global_admin() OR public.is_project_member(auth.uid(), project_id));

-- Contracts
DROP POLICY IF EXISTS "Project members can view contracts" ON public.contracts;
CREATE POLICY "Project members can view contracts"
ON public.contracts FOR SELECT
USING (public.is_global_admin() OR public.is_project_member(auth.uid(), project_id));

-- Cost Centers
DROP POLICY IF EXISTS "Project members can view cost centers" ON public.cost_centers;
CREATE POLICY "Project members can view cost centers"
ON public.cost_centers FOR SELECT
USING (public.is_global_admin() OR public.is_project_member(auth.uid(), project_id));

-- Approval History
DROP POLICY IF EXISTS "Project members can view approval history" ON public.approval_history;
CREATE POLICY "Project members can view approval history"
ON public.approval_history FOR SELECT
USING (
  public.is_global_admin() OR
  EXISTS (
    SELECT 1 FROM public.estimations e
    WHERE e.id = estimation_id
    AND public.is_project_member(auth.uid(), e.project_id)
  )
);

-- Profiles (view all profiles if admin)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles; -- Ensure cleanup if renamed
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
USING (public.is_global_admin() OR auth.uid() = id);

-- Assign Role Script
DO $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
  v_admin_email TEXT := 'armandoag_1996@hotmail.com';
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_admin_email;

  IF v_user_id IS NOT NULL THEN
    -- Get or Create Project
    SELECT id INTO v_project_id FROM public.projects LIMIT 1;

    IF v_project_id IS NULL THEN
      INSERT INTO public.projects (name, description, created_by)
      VALUES ('Soporte General', 'Proyecto para gestión global de soporte', v_user_id)
      RETURNING id INTO v_project_id;
    END IF;

    -- Assign Role
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (v_project_id, v_user_id, 'soporte_tecnico')
    ON CONFLICT (project_id, user_id, role) DO NOTHING;
  END IF;
END $$;
