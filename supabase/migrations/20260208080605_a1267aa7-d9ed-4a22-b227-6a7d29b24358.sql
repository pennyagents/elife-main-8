-- Add rank column to program_registrations
ALTER TABLE public.program_registrations
ADD COLUMN rank integer NULL;