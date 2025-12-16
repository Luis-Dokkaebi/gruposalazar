-- Add 'submitted' status to enum
ALTER TYPE public.estimation_status ADD VALUE IF NOT EXISTS 'submitted' BEFORE 'registered';
