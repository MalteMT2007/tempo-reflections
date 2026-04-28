-- Add 'declined' value to invite_status so invitees can decline ensemble invites
ALTER TYPE public.invite_status ADD VALUE IF NOT EXISTS 'declined';

-- Allow the invitee (by user id or matching email) to update their own invite
-- so they can mark it declined / accepted from the inbox.
DROP POLICY IF EXISTS "Invitee can respond" ON public.ensemble_invites;
CREATE POLICY "Invitee can respond"
  ON public.ensemble_invites
  FOR UPDATE
  TO authenticated
  USING (
    invitee_user_id = auth.uid()
    OR (email IS NOT NULL AND lower(email) = lower(public.current_user_email()))
  )
  WITH CHECK (
    invitee_user_id = auth.uid()
    OR (email IS NOT NULL AND lower(email) = lower(public.current_user_email()))
  );