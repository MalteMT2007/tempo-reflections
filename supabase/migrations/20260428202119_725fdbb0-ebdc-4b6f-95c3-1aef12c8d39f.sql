ALTER TABLE public.ensembles
ADD COLUMN IF NOT EXISTS type text;

ALTER TABLE public.ensembles
ADD CONSTRAINT ensembles_type_check
CHECK (type IS NULL OR type IN ('orchestra', 'band', 'choir'));