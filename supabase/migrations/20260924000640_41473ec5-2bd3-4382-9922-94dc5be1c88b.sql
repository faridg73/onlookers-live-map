GRANT SELECT, UPDATE ON public.support_tickets TO authenticated;
CREATE POLICY "Review staff can view support tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_review_staff(auth.uid()));
CREATE POLICY "Review staff can update support tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_review_staff(auth.uid())) WITH CHECK (public.is_review_staff(auth.uid()));