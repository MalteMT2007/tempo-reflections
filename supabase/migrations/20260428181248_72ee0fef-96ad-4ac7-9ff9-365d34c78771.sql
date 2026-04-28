-- Ensemble roster (placeholder members not tied to an auth user)
CREATE TABLE public.ensemble_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id uuid NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  name text NOT NULL,
  instrument text,
  section_id uuid REFERENCES public.ensemble_sections(id) ON DELETE SET NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ensemble_roster_ensemble ON public.ensemble_roster(ensemble_id);

ALTER TABLE public.ensemble_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view roster"
  ON public.ensemble_roster FOR SELECT TO authenticated
  USING (public.is_ensemble_member(ensemble_id, auth.uid()));

CREATE POLICY "Admins insert roster"
  ON public.ensemble_roster FOR INSERT TO authenticated
  WITH CHECK (public.is_ensemble_admin(ensemble_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Admins update roster"
  ON public.ensemble_roster FOR UPDATE TO authenticated
  USING (public.is_ensemble_admin(ensemble_id, auth.uid()));

CREATE POLICY "Admins delete roster"
  ON public.ensemble_roster FOR DELETE TO authenticated
  USING (public.is_ensemble_admin(ensemble_id, auth.uid()));

CREATE TRIGGER trg_ensemble_roster_updated
  BEFORE UPDATE ON public.ensemble_roster
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profile experiences (LinkedIn-style career entries)
CREATE TABLE public.profile_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'experience', -- 'experience' | 'education' | 'achievement'
  title text NOT NULL,                      -- role / degree / award
  organization text,                        -- employer / school / issuer
  location text,
  start_year int,
  end_year int,                             -- null = present
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_experiences_user ON public.profile_experiences(user_id, sort_order);

ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experiences viewable by authenticated"
  ON public.profile_experiences FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users insert own experiences"
  ON public.profile_experiences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own experiences"
  ON public.profile_experiences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own experiences"
  ON public.profile_experiences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_profile_experiences_updated
  BEFORE UPDATE ON public.profile_experiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();