-- Remove the overly broad SELECT policy
DROP POLICY "Authenticated users can view basic profiles" ON public.profiles;

-- Recreate view as security_definer (default) so it works without the broad policy
-- This is safe because the view excludes the email column
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
  SELECT id, display_name, first_name, last_name, avatar_url, created_at, updated_at
  FROM public.profiles;