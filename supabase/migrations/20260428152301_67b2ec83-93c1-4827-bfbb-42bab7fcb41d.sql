-- Helper to check if a score is shared with an ensemble the user belongs to
CREATE OR REPLACE FUNCTION public.score_shared_with_user(_score_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.score_ensembles se
    JOIN public.ensemble_members em ON em.ensemble_id = se.ensemble_id
    WHERE se.score_id = _score_id
      AND em.user_id = _user
  );
$$;

-- Replace recursive policy on scores
DROP POLICY IF EXISTS "Ensemble members can view shared scores" ON public.scores;

CREATE POLICY "Ensemble members can view shared scores"
ON public.scores
FOR SELECT
TO authenticated
USING (public.score_shared_with_user(id, auth.uid()));

-- Also harden score_ensembles SELECT policy to avoid touching scores recursively.
-- Use a SECURITY DEFINER helper for owner-check.
CREATE OR REPLACE FUNCTION public.is_score_owner(_score_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scores s
    WHERE s.id = _score_id AND s.owner_id = _user
  );
$$;

DROP POLICY IF EXISTS "Members and owner can view sharing" ON public.score_ensembles;
CREATE POLICY "Members and owner can view sharing"
ON public.score_ensembles
FOR SELECT
TO authenticated
USING (
  public.is_ensemble_member(ensemble_id, auth.uid())
  OR public.is_score_owner(score_id, auth.uid())
);

DROP POLICY IF EXISTS "Owner can share their score" ON public.score_ensembles;
CREATE POLICY "Owner can share their score"
ON public.score_ensembles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = shared_by
  AND public.is_score_owner(score_id, auth.uid())
  AND public.is_ensemble_member(ensemble_id, auth.uid())
);

DROP POLICY IF EXISTS "Owner can unshare their score" ON public.score_ensembles;
CREATE POLICY "Owner can unshare their score"
ON public.score_ensembles
FOR DELETE
TO authenticated
USING (public.is_score_owner(score_id, auth.uid()));