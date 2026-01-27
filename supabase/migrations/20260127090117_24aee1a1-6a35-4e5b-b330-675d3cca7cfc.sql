-- Drop the existing restrictive policy for authenticated users
DROP POLICY IF EXISTS "Panchayaths viewable by authenticated" ON public.panchayaths;

-- Create a new policy that allows anyone to view panchayaths (public data)
CREATE POLICY "Panchayaths are viewable by everyone"
ON public.panchayaths
FOR SELECT
USING (true);