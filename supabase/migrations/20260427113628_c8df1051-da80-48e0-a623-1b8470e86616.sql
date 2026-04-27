-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  instrument TEXT,
  genre TEXT,
  genre_label TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := COALESCE(
    NULLIF(regexp_replace(lower(split_part(NEW.email, '@', 1)), '[^a-z0-9_]', '', 'g'), ''),
    'user'
  );
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', final_username)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FRIENDSHIPS ============
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted');

CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_pair UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own friendships"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can request friendships"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee or requester can update"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = addressee_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER friendships_set_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper function to check if two users are friends (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.are_friends(_a UUID, _b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = _a AND addressee_id = _b)
        OR (requester_id = _b AND addressee_id = _a))
  );
$$;

-- ============ ENSEMBLES ============
CREATE TABLE public.ensembles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ensemble_members (
  ensemble_id UUID NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ensemble_id, user_id)
);

ALTER TABLE public.ensembles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensemble_members ENABLE ROW LEVEL SECURITY;

-- Helper: is user a member?
CREATE OR REPLACE FUNCTION public.is_ensemble_member(_ensemble UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ensemble_members
    WHERE ensemble_id = _ensemble AND user_id = _user
  );
$$;

CREATE POLICY "Ensembles viewable by authenticated"
  ON public.ensembles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create ensembles"
  ON public.ensembles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update ensemble"
  ON public.ensembles FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete ensemble"
  ON public.ensembles FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER ensembles_set_updated_at
  BEFORE UPDATE ON public.ensembles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Members visible to authenticated"
  ON public.ensemble_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join ensembles themselves"
  ON public.ensemble_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave ensembles"
  ON public.ensemble_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Auto-add creator as member
CREATE OR REPLACE FUNCTION public.handle_new_ensemble()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ensemble_members (ensemble_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'creator');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ensemble_created
  AFTER INSERT ON public.ensembles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_ensemble();

-- ============ PRACTICE SESSIONS ============
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  byline TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX practice_sessions_user_started_idx
  ON public.practice_sessions (user_id, started_at DESC);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own and friends sessions"
  ON public.practice_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.are_friends(auth.uid(), user_id)
  );

CREATE POLICY "Users insert own sessions"
  ON public.practice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sessions"
  ON public.practice_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);