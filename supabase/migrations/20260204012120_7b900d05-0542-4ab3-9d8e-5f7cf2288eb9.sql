-- Add columns for responsibility scope
-- Team Leaders can be responsible for multiple panchayaths
-- Coordinators can be responsible for multiple wards within their panchayath

ALTER TABLE public.pennyekart_agents 
ADD COLUMN responsible_panchayath_ids uuid[] DEFAULT '{}',
ADD COLUMN responsible_wards text[] DEFAULT '{}';