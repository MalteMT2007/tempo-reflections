
-- Helper that safely fetches the current user's email without granting access to auth.users
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- Recreate the invite SELECT policy without the direct auth.users subquery
DROP POLICY IF EXISTS "Invites visible to admin or invitee" ON public.ensemble_invites;

CREATE POLICY "Invites visible to admin or invitee"
ON public.ensemble_invites
FOR SELECT TO authenticated
USING (
  public.is_ensemble_admin(ensemble_id, auth.uid())
  OR invitee_user_id = auth.uid()
  OR (email IS NOT NULL AND lower(email) = lower(public.current_user_email()))
);
