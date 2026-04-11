-- Clinical Cases table
CREATE TABLE IF NOT EXISTS public.clinical_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- slides JSONB structure:
-- [{ "image_url": "...", "caption": "...", "is_reveal": false }, ...]

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_cases_published ON public.clinical_cases (published, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_category ON public.clinical_cases (category);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_clinical_cases_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER clinical_cases_updated_at
  BEFORE UPDATE ON public.clinical_cases
  FOR EACH ROW EXECUTE FUNCTION update_clinical_cases_updated_at();

-- RLS
ALTER TABLE public.clinical_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view published cases"
  ON public.clinical_cases FOR SELECT TO authenticated
  USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins and faculty can create cases"
  ON public.clinical_cases FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'faculty')
  );

CREATE POLICY "Authors and admins can update cases"
  ON public.clinical_cases FOR UPDATE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authors and admins can delete cases"
  ON public.clinical_cases FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Storage bucket for case images
INSERT INTO storage.buckets (id, name, public) VALUES ('case-images', 'case-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload case images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'case-images');

CREATE POLICY "Anyone can view case images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'case-images');

CREATE POLICY "Authors and admins can delete case images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'case-images');

-- Role permissions seed
INSERT INTO public.role_permissions (role, permission_key, access_level)
VALUES
  ('admin', 'cases.view', 'full'),
  ('admin', 'cases.edit', 'full'),
  ('faculty', 'cases.view', 'none'),
  ('faculty', 'cases.edit', 'none'),
  ('resident', 'cases.view', 'none'),
  ('resident', 'cases.edit', 'none')
ON CONFLICT (role, permission_key) DO NOTHING;
