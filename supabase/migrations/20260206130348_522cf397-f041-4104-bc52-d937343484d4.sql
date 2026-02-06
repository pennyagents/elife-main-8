
-- Add permission columns to admins table
ALTER TABLE public.admins 
ADD COLUMN access_all_divisions boolean NOT NULL DEFAULT false,
ADD COLUMN additional_division_ids uuid[] NOT NULL DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.admins.access_all_divisions IS 'When true, admin can access all divisions';
COMMENT ON COLUMN public.admins.additional_division_ids IS 'Additional division IDs the admin can access beyond their primary division';
