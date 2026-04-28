ALTER TABLE public.scores ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_scores_owner_favorite ON public.scores(owner_id, favorite);