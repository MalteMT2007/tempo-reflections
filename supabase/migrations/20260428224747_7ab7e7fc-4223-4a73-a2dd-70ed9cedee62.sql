ALTER TABLE public.score_annotations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_annotations;

-- Allow note owner to delete any annotation on their score (collaborative cleanup)
CREATE POLICY "Score owner can delete any annotation"
ON public.score_annotations
FOR DELETE
TO authenticated
USING (public.is_score_owner(score_id, auth.uid()));