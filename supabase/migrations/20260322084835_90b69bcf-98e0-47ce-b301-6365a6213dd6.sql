-- Switch back to security_invoker (preferred) and add auth-only policy
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public WITH (security_invoker = on) AS
  SELECT id, display_name, first_name, last_name, avatar_url, created_at, updated_at
  FROM public.profiles;

-- Add back a policy scoped to authenticated users only (not public/anonymous)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);