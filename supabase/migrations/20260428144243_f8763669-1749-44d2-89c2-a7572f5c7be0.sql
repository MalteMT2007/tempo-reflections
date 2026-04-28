-- =========================================
-- SCORES
-- =========================================
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  composer TEXT,
  instrument TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  file_path TEXT NOT NULL, -- path inside `scores` bucket
  page_count INT NOT NULL DEFAULT 0,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scores_owner ON public.scores(owner_id);
CREATE INDEX idx_scores_created ON public.scores(created_at DESC);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- =========================================
-- SCORE <-> ENSEMBLE sharing
-- =========================================
CREATE TABLE public.score_ensembles (
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (score_id, ensemble_id)
);

CREATE INDEX idx_score_ensembles_ensemble ON public.score_ensembles(ensemble_id);

ALTER TABLE public.score_ensembles ENABLE ROW LEVEL SECURITY;

-- Helper: can a user view a given score?
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

-- Scores RLS
CREATE POLICY "Owner can view own scores"
ON public.scores FOR SELECT TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Ensemble members can view shared scores"
ON public.scores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.score_ensembles se
    JOIN public.ensemble_members em ON em.ensemble_id = se.ensemble_id
    WHERE se.score_id = scores.id AND em.user_id = auth.uid()
  )
);

CREATE POLICY "Owner can insert scores"
ON public.scores FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner can update scores"
ON public.scores FOR UPDATE TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Owner can delete scores"
ON public.scores FOR DELETE TO authenticated
USING (auth.uid() = owner_id);

-- score_ensembles RLS
CREATE POLICY "Owner can share their score"
ON public.score_ensembles FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = shared_by
  AND EXISTS (SELECT 1 FROM public.scores s WHERE s.id = score_id AND s.owner_id = auth.uid())
  AND public.is_ensemble_member(ensemble_id, auth.uid())
);

CREATE POLICY "Members and owner can view sharing"
ON public.score_ensembles FOR SELECT TO authenticated
USING (
  public.is_ensemble_member(ensemble_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.scores s WHERE s.id = score_id AND s.owner_id = auth.uid())
);

CREATE POLICY "Owner can unshare their score"
ON public.score_ensembles FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.scores s WHERE s.id = score_id AND s.owner_id = auth.uid())
);

-- =========================================
-- ANNOTATIONS
-- =========================================
CREATE TABLE public.score_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_index INT NOT NULL DEFAULT 0,
  kind TEXT NOT NULL CHECK (kind IN ('stroke','text')),
  -- normalized geometry / payload (e.g. {points:[{x,y}], color, width} or {x,y,text,color,size})
  data JSONB NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor', -- future hierarchy: owner/editor/viewer
  session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_annotations_score_page ON public.score_annotations(score_id, page_index);
CREATE INDEX idx_annotations_user ON public.score_annotations(user_id);

ALTER TABLE public.score_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers can read annotations"
ON public.score_annotations FOR SELECT TO authenticated
USING (public.can_view_score(score_id, auth.uid()));

CREATE POLICY "Users insert own annotations"
ON public.score_annotations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_view_score(score_id, auth.uid())
);

CREATE POLICY "Users update own annotations"
ON public.score_annotations FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own annotations"
ON public.score_annotations FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- =========================================
-- SESSION <-> SCORES
-- =========================================
CREATE TABLE public.session_scores (
  session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  score_id UUID NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, score_id)
);

CREATE INDEX idx_session_scores_score ON public.session_scores(score_id);

ALTER TABLE public.session_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view session-score links"
ON public.session_scores FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.practice_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.scores s WHERE s.id = score_id AND s.owner_id = auth.uid())
);

CREATE POLICY "Owner can attach scores to own session"
ON public.session_scores FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.practice_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid())
  AND public.can_view_score(score_id, auth.uid())
);

CREATE POLICY "Owner can detach"
ON public.session_scores FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.practice_sessions ps WHERE ps.id = session_id AND ps.user_id = auth.uid())
);

-- =========================================
-- updated_at triggers
-- =========================================
CREATE TRIGGER trg_scores_updated
BEFORE UPDATE ON public.scores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_annotations_updated
BEFORE UPDATE ON public.score_annotations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- STORAGE: private `scores` bucket
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('scores', 'scores', false)
ON CONFLICT (id) DO NOTHING;

-- File path convention: {auth.uid()}/{score_id}.pdf
CREATE POLICY "Users can read own score files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'scores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Ensemble members can read shared score files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'scores'
  AND EXISTS (
    SELECT 1
    FROM public.scores s
    JOIN public.score_ensembles se ON se.score_id = s.id
    JOIN public.ensemble_members em ON em.ensemble_id = se.ensemble_id
    WHERE s.file_path = name
      AND em.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload own score files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'scores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own score files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'scores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own score files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'scores'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
