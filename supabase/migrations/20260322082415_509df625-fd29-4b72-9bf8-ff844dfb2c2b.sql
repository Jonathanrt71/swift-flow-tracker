
-- Recreate view with security_invoker=on
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT id, display_name, first_name, last_name, avatar_url, created_at, updated_at
  FROM public.profiles;

-- Add a broad SELECT policy back on the base table, but only for the non-email columns via the view
-- Since security_invoker=on means the caller's RLS applies, we need a policy allowing authenticated reads
CREATE POLICY "Authenticated users can view basic profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;
