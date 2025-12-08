-- Enum para roles de la aplicación
CREATE TYPE public.app_role AS ENUM ('contratista', 'residente', 'superintendente', 'lider_proyecto', 'compras', 'finanzas', 'pagos');

-- Enum para estados de estimación
CREATE TYPE public.estimation_status AS ENUM (
  'registered', 
  'auth_resident', 
  'auth_super', 
  'auth_leader', 
  'validated_compras', 
  'factura_subida', 
  'validated_finanzas', 
  'paid'
);

-- Tabla de perfiles de usuario
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de proyectos
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de roles de usuario por proyecto (un usuario puede tener diferentes roles en diferentes proyectos)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id, role)
);

-- Tabla de centros de costos
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de contratos
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de estimaciones
CREATE TABLE public.estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT NOT NULL,
  project_number TEXT NOT NULL,
  contract_id UUID REFERENCES public.contracts(id),
  cost_center_id UUID REFERENCES public.cost_centers(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  contractor_name TEXT NOT NULL,
  pdf_url TEXT,
  invoice_url TEXT,
  status estimation_status NOT NULL DEFAULT 'registered',
  amount DECIMAL(15,2) NOT NULL,
  estimation_text TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resident_approved_at TIMESTAMP WITH TIME ZONE,
  superintendent_approved_at TIMESTAMP WITH TIME ZONE,
  leader_approved_at TIMESTAMP WITH TIME ZONE,
  compras_approved_at TIMESTAMP WITH TIME ZONE,
  invoice_uploaded_at TIMESTAMP WITH TIME ZONE,
  finanzas_approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de historial de aprobaciones
CREATE TABLE public.approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimation_id UUID REFERENCES public.estimations(id) ON DELETE CASCADE NOT NULL,
  status estimation_status NOT NULL,
  role app_role NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  user_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de invitaciones a proyectos
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  email TEXT, -- NULL si es invitación abierta
  used_by UUID REFERENCES public.profiles(id),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

-- Función SECURITY DEFINER para verificar membresía en proyecto
CREATE OR REPLACE FUNCTION public.is_project_member(_user_id UUID, _project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id AND project_id = _project_id
  )
$$;

-- Función SECURITY DEFINER para verificar rol en proyecto
CREATE OR REPLACE FUNCTION public.has_project_role(_user_id UUID, _project_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE user_id = _user_id 
      AND project_id = _project_id 
      AND role = _role
  )
$$;

-- Función para obtener roles existentes en un proyecto (para lógica de cascada)
CREATE OR REPLACE FUNCTION public.get_project_roles(_project_id UUID)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(DISTINCT role)
  FROM public.project_members
  WHERE project_id = _project_id
$$;

-- Función principal: Determinar el siguiente estado basado en roles existentes
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
  has_residente BOOLEAN;
  has_super BOOLEAN;
  has_lider BOOLEAN;
BEGIN
  -- Obtener roles del proyecto
  SELECT COALESCE(get_project_roles(_project_id), ARRAY[]::app_role[]) INTO project_roles;
  
  has_residente := 'residente' = ANY(project_roles);
  has_super := 'superintendente' = ANY(project_roles);
  has_lider := 'lider_proyecto' = ANY(project_roles);
  
  -- Lógica de cascada basada en estado actual
  CASE _current_status
    -- Estado inicial: buscar primer aprobador existente
    WHEN 'registered' THEN
      IF has_residente THEN RETURN 'auth_resident';
      ELSIF has_super THEN RETURN 'auth_super';
      ELSIF has_lider THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras'; -- Si no hay aprobadores técnicos, ir a compras
      END IF;
      
    -- Después de residente: buscar siguiente
    WHEN 'auth_resident' THEN
      IF has_super THEN RETURN 'auth_super';
      ELSIF has_lider THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- Después de super: buscar siguiente
    WHEN 'auth_super' THEN
      IF has_lider THEN RETURN 'auth_leader';
      ELSE RETURN 'validated_compras';
      END IF;
      
    -- Después de líder: siempre ir a compras
    WHEN 'auth_leader' THEN
      RETURN 'validated_compras';
      
    -- Después de compras: esperar factura
    WHEN 'validated_compras' THEN
      RETURN 'factura_subida';
      
    -- Después de factura: ir a finanzas
    WHEN 'factura_subida' THEN
      RETURN 'validated_finanzas';
      
    -- Después de finanzas: ir a pagos
    WHEN 'validated_finanzas' THEN
      RETURN 'paid';
      
    ELSE
      RETURN _current_status;
  END CASE;
END;
$$;

-- Función para determinar qué rol debe aprobar el estado actual
CREATE OR REPLACE FUNCTION public.get_required_role_for_status(_status estimation_status)
RETURNS app_role
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _status
    WHEN 'registered' THEN 'residente'::app_role
    WHEN 'auth_resident' THEN 'superintendente'::app_role
    WHEN 'auth_super' THEN 'lider_proyecto'::app_role
    WHEN 'auth_leader' THEN 'compras'::app_role
    WHEN 'validated_compras' THEN 'contratista'::app_role
    WHEN 'factura_subida' THEN 'finanzas'::app_role
    WHEN 'validated_finanzas' THEN 'pagos'::app_role
    ELSE NULL
  END
$$;

-- Función para crear invitación
CREATE OR REPLACE FUNCTION public.create_project_invitation(
  _project_id UUID,
  _role app_role,
  _email TEXT DEFAULT NULL,
  _expires_in_days INTEGER DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_id UUID;
  invitation_token TEXT;
BEGIN
  -- Generar token único
  invitation_token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO public.project_invitations (
    project_id, token, role, email, expires_at, created_by
  ) VALUES (
    _project_id,
    invitation_token,
    _role,
    _email,
    NOW() + (_expires_in_days || ' days')::INTERVAL,
    auth.uid()
  )
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$;

-- Función para aceptar invitación
CREATE OR REPLACE FUNCTION public.accept_project_invitation(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation RECORD;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;
  
  -- Buscar invitación válida
  SELECT * INTO invitation
  FROM public.project_invitations
  WHERE token = _token
    AND used_by IS NULL
    AND expires_at > NOW();
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitación inválida o expirada');
  END IF;
  
  -- Verificar email si la invitación es específica
  IF invitation.email IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = current_user_id AND email = invitation.email
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Esta invitación es para otro usuario');
    END IF;
  END IF;
  
  -- Agregar usuario al proyecto
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (invitation.project_id, current_user_id, invitation.role)
  ON CONFLICT (project_id, user_id, role) DO NOTHING;
  
  -- Marcar invitación como usada
  UPDATE public.project_invitations
  SET used_by = current_user_id, used_at = NOW()
  WHERE id = invitation.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'project_id', invitation.project_id,
    'role', invitation.role
  );
END;
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Políticas RLS para projects
CREATE POLICY "Project members can view projects"
ON public.projects FOR SELECT
USING (public.is_project_member(auth.uid(), id) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Project creators can update projects"
ON public.projects FOR UPDATE
USING (created_by = auth.uid());

-- Políticas RLS para project_members
CREATE POLICY "Project members can view other members"
ON public.project_members FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project creators can add members"
ON public.project_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND created_by = auth.uid()
  )
  OR auth.uid() = user_id -- Para auto-inscripción via invitación
);

-- Políticas RLS para cost_centers
CREATE POLICY "Project members can view cost centers"
ON public.cost_centers FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create cost centers"
ON public.cost_centers FOR INSERT
WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- Políticas RLS para contracts
CREATE POLICY "Project members can view contracts"
ON public.contracts FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create contracts"
ON public.contracts FOR INSERT
WITH CHECK (public.is_project_member(auth.uid(), project_id));

-- Políticas RLS para estimations
CREATE POLICY "Project members can view estimations"
ON public.estimations FOR SELECT
USING (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create estimations"
ON public.estimations FOR INSERT
WITH CHECK (public.is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can update estimations"
ON public.estimations FOR UPDATE
USING (public.is_project_member(auth.uid(), project_id));

-- Políticas RLS para approval_history
CREATE POLICY "Project members can view approval history"
ON public.approval_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.estimations e
    WHERE e.id = estimation_id 
    AND public.is_project_member(auth.uid(), e.project_id)
  )
);

CREATE POLICY "Project members can add approval history"
ON public.approval_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.estimations e
    WHERE e.id = estimation_id 
    AND public.is_project_member(auth.uid(), e.project_id)
  )
);

-- Políticas RLS para project_invitations
CREATE POLICY "Project creators can view invitations"
ON public.project_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
);

CREATE POLICY "Anyone can view invitation by token"
ON public.project_invitations FOR SELECT
USING (true);

CREATE POLICY "Project creators can create invitations"
ON public.project_invitations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND p.created_by = auth.uid()
  )
);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimations_updated_at
  BEFORE UPDATE ON public.estimations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();