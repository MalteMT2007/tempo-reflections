-- Already had SET search_path; re-declare to be safe and revoke execute
CREATE OR REPLACE FUNCTION public.can_view_score(_score_id UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scores s
    WHERE s.id = _score_id AND s.owner_id = _user
  ) OR EXISTS (
    SELECT 1 FROM public.score_ensembles se
    JOIN public.ensemble_members em ON em.ensemble_id = se.ensemble_id
    WHERE se.score_id = _score_id AND em.user_id = _user
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_score(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.are_friends(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_ensemble_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
