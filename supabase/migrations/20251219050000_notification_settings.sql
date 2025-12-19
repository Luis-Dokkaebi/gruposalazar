-- Create a table for managing notification recipients per estimation
CREATE TABLE IF NOT EXISTS public.estimation_notification_recipients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    estimation_id uuid REFERENCES public.estimations(id) ON DELETE CASCADE,
    email text NOT NULL,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id)
);

-- Policy to allow authenticated users to view (or restrict to support/involved)
ALTER TABLE public.estimation_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notification recipients for their projects"
ON public.estimation_notification_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.estimations e
    JOIN public.project_members pm ON pm.project_id = e.project_id
    WHERE e.id = estimation_notification_recipients.estimation_id
    AND pm.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
);

CREATE POLICY "Support can insert recipients"
ON public.estimation_notification_recipients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
);

CREATE POLICY "Support can delete recipients"
ON public.estimation_notification_recipients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
);
