ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.rater_id = NEW.ratee_id THEN RAISE EXCEPTION 'You cannot rate yourself'; END IF;
  IF length(NEW.note) > 280 THEN RAISE EXCEPTION 'Note is too long'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM requests r JOIN claims c ON c.request_id = r.id
    WHERE r.id = NEW.request_id AND r.requester_id = NEW.rater_id
      AND c.spotter_id = NEW.ratee_id AND c.status = 'approved'
  ) THEN RAISE EXCEPTION 'You can only rate the hunter after the job is complete'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_rating_trg ON public.ratings;
CREATE TRIGGER validate_rating_trg BEFORE INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.validate_rating();

GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;