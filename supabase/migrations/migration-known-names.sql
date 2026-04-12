-- Migration: known_names table
-- Used by the de-identification engine to catch staff names, 
-- external providers, and other non-user names that appear in 
-- imported documents (Press Ganey, evaluations, etc.)
--
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.known_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT GENERATED ALWAYS AS (last_name || ', ' || first_name) STORED,
  category TEXT NOT NULL DEFAULT 'staff',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.known_names ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (needed for de-identification in browser)
CREATE POLICY "Authenticated users can view known_names"
  ON public.known_names FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert known_names"
  ON public.known_names FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update known_names"
  ON public.known_names FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete known_names"
  ON public.known_names FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for quick lookups
CREATE INDEX idx_known_names_names ON public.known_names (lower(last_name), lower(first_name));

COMMENT ON TABLE public.known_names IS 'Non-user names (staff, external providers) for de-identification during document imports';
