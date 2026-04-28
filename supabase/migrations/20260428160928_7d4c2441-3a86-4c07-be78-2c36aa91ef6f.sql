
-- Enums
CREATE TYPE public.room_role AS ENUM ('admin', 'member');
CREATE TYPE public.room_invite_status AS ENUM ('pending', 'accepted', 'declined');

-- ===== Posts =====
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts viewable by authenticated" ON public.posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authors insert posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors delete posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE TRIGGER posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_posts_created_at ON public.posts (created_at DESC);
CREATE INDEX idx_posts_author ON public.posts (author_id);

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by authenticated" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like posts" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike posts" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by authenticated" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authors insert comments" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors delete comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);
CREATE INDEX idx_post_comments_post ON public.post_comments (post_id, created_at);

CREATE TABLE public.post_reposts (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reposts viewable by authenticated" ON public.post_reposts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users repost" ON public.post_reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unrepost" ON public.post_reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== Rooms =====
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text,
  avatar_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.room_members (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.room_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_room_messages_room ON public.room_messages (room_id, created_at);

CREATE TABLE public.room_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status public.room_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (room_id, invitee_id)
);
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

-- ===== Helper functions (after tables exist) =====
CREATE OR REPLACE FUNCTION public.is_room_member(_room uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(_room uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE room_id = _room AND user_id = _user AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.user_has_room_invite(_room uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_invites WHERE room_id = _room AND invitee_id = _user AND status = 'pending');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;
CREATE TRIGGER rooms_add_creator AFTER INSERT ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.handle_new_room();

-- ===== RLS policies that depend on the helpers =====
CREATE POLICY "Rooms visible if public or member" ON public.rooms FOR SELECT TO authenticated
  USING (is_public OR public.is_room_member(id, auth.uid()));
CREATE POLICY "Authenticated create rooms" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins update rooms" ON public.rooms FOR UPDATE TO authenticated
  USING (public.is_room_admin(id, auth.uid()));
CREATE POLICY "Admins delete rooms" ON public.rooms FOR DELETE TO authenticated
  USING (public.is_room_admin(id, auth.uid()));

CREATE POLICY "Members visible to authenticated" ON public.room_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Join public rooms or via invite" ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.is_public)
      OR public.user_has_room_invite(room_id, auth.uid())
    )
  );
CREATE POLICY "Leave or admin removes" ON public.room_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_room_admin(room_id, auth.uid()));

CREATE POLICY "Members read messages" ON public.room_messages FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Members send messages" ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.is_room_member(room_id, auth.uid()));
CREATE POLICY "Authors delete messages" ON public.room_messages FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Invites visible to invitee or admin" ON public.room_invites FOR SELECT TO authenticated
  USING (invitee_id = auth.uid() OR public.is_room_admin(room_id, auth.uid()));
CREATE POLICY "Admins create invites" ON public.room_invites FOR INSERT TO authenticated
  WITH CHECK (public.is_room_admin(room_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "Invitee responds" ON public.room_invites FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid());
CREATE POLICY "Admins or invitee delete" ON public.room_invites FOR DELETE TO authenticated
  USING (invitee_id = auth.uid() OR public.is_room_admin(room_id, auth.uid()));

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites;
