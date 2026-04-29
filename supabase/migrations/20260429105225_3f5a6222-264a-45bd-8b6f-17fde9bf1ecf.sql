-- Personal "concerts" / setlists per user
CREATE TABLE IF NOT EXISTS public.score_setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  occasion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.score_setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own setlists" ON public.score_setlists
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner inserts own setlists" ON public.score_setlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates own setlists" ON public.score_setlists
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner deletes own setlists" ON public.score_setlists
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER score_setlists_set_updated_at
  BEFORE UPDATE ON public.score_setlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Many-to-many: which scores are in which setlist
CREATE TABLE IF NOT EXISTS public.setlist_scores (
  setlist_id UUID NOT NULL REFERENCES public.score_setlists(id) ON DELETE CASCADE,
  score_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (setlist_id, score_id)
);

ALTER TABLE public.setlist_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views own setlist items" ON public.setlist_scores
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.score_setlists s WHERE s.id = setlist_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Owner inserts setlist items" ON public.setlist_scores
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.score_setlists s WHERE s.id = setlist_id AND s.owner_id = auth.uid())
    AND public.can_view_score(score_id, auth.uid())
  );
CREATE POLICY "Owner updates setlist items" ON public.setlist_scores
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.score_setlists s WHERE s.id = setlist_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Owner deletes setlist items" ON public.setlist_scores
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.score_setlists s WHERE s.id = setlist_id AND s.owner_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_setlist_scores_score ON public.setlist_scores(score_id);
CREATE INDEX IF NOT EXISTS idx_score_setlists_owner ON public.score_setlists(owner_id);