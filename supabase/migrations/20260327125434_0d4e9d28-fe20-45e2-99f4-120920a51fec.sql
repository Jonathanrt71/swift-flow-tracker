ALTER TABLE public.event_evaluations
  ADD COLUMN rating_preparation text,
  ADD COLUMN rating_presentation text,
  ADD COLUMN rating_content text,
  ADD COLUMN rating_overall text;