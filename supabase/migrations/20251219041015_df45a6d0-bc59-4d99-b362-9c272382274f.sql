-- Add soporte_tecnico role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'soporte_tecnico';