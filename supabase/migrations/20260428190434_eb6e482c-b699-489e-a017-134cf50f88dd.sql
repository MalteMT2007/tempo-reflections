-- Public bucket for room avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-avatars', 'room-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone authenticated can view (also public bucket so SELECT works publicly)
CREATE POLICY "Room avatars publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-avatars');

-- Room admins can upload to their room's folder (path = "<room_id>/...")
CREATE POLICY "Room admins upload room avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'room-avatars'
  AND public.is_room_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Room admins update room avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'room-avatars'
  AND public.is_room_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

CREATE POLICY "Room admins delete room avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'room-avatars'
  AND public.is_room_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);