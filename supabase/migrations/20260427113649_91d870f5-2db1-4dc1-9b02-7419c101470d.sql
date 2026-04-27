-- Lock down SECURITY DEFINER helpers (search_path already set in CREATE)
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_ensemble() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_ensemble_member(uuid, uuid) FROM PUBLIC, anon;
-- authenticated keeps EXECUTE on the two helpers (used in RLS USING clauses)