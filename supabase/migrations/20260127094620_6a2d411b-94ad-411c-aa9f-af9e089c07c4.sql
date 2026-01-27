-- Add full_name column to admins table
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Make user_id nullable since admins will no longer require auth.users
ALTER TABLE public.admins ALTER COLUMN user_id DROP NOT NULL;