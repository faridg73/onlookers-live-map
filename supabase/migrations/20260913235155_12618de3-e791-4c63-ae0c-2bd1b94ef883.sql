DROP POLICY IF EXISTS "Signed-in members can see contributions" ON public.pool_contributions;

CREATE POLICY "Contributors and creators can view their pool contributions"
  ON public.pool_contributions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bounty_pools bp
      WHERE bp.id = pool_id AND bp.creator_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.pool_backer_counts(_pool_ids uuid[])
RETURNS TABLE(pool_id uuid, backer_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pool_id, count(DISTINCT user_id)::integer
  FROM public.pool_contributions
  WHERE pool_id = ANY(_pool_ids)
  GROUP BY pool_id;
$$;

REVOKE ALL ON FUNCTION public.pool_backer_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pool_backer_counts(uuid[]) TO authenticated;