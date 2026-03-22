
DROP POLICY "Authenticated users can view feedback" ON public.feedback;

CREATE POLICY "Residents can view own feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (resident_id = auth.uid());

CREATE POLICY "Faculty can view their feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (faculty_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON public.feedback FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
