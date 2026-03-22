
-- Create a public view excluding email
CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
  SELECT id, display_name, first_name, last_name, avatar_url, created_at, updated_at
  FROM public.profiles;

-- Only authenticated users can query the view
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Drop the overly broad policy that exposes email to all users
DROP POLICY "Authenticated users can view all profiles" ON public.profiles;
