-- Add column for XML invoice URL
ALTER TABLE public.estimations 
ADD COLUMN IF NOT EXISTS invoice_xml_url text;

-- Create support_messages table for help requests
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Support can view all messages for projects they belong to
CREATE POLICY "Support can view project messages"
ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = support_messages.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
);

-- Policy: Project members can create messages
CREATE POLICY "Project members can send messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  is_project_member(auth.uid(), project_id)
  AND sender_id = auth.uid()
);

-- Policy: Users can view their own messages
CREATE POLICY "Users can view own messages"
ON public.support_messages
FOR SELECT
USING (sender_id = auth.uid());

-- Policy: Support can update messages (mark as read)
CREATE POLICY "Support can update messages"
ON public.support_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = support_messages.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'soporte_tecnico'
  )
);