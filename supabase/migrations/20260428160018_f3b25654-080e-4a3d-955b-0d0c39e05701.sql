CREATE TYPE public.ensemble_role AS ENUM ('admin', 'member', 'section_member');
CREATE TYPE public.project_status AS ENUM ('planning', 'rehearsing', 'completed');
CREATE TYPE public.event_type AS ENUM ('rehearsal', 'concert');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'revoked');
CREATE TYPE public.assignee_type AS ENUM ('section', 'member');

CREATE TABLE public.ensemble_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id uuid NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ensemble_id, name)
);
ALTER TABLE public.ensemble_sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ensemble_members ADD COLUMN role_new public.ensemble_role;
UPDATE public.ensemble_members SET role_new = CASE WHEN role = 'creator' THEN 'admin'::public.ensemble_role ELSE 'member'::public.ensemble_role END;
ALTER TABLE public.ensemble_members DROP COLUMN role;
ALTER TABLE public.ensemble_members RENAME COLUMN role_new TO role;
ALTER TABLE public.ensemble_members ALTER COLUMN role SET NOT NULL;
ALTER TABLE public.ensemble_members ALTER COLUMN role SET DEFAULT 'member';
ALTER TABLE public.ensemble_members ADD COLUMN section_id uuid REFERENCES public.ensemble_sections(id) ON DELETE SET NULL;

INSERT INTO public.ensemble_members (ensemble_id, user_id, role)
SELECT e.id, e.created_by, 'admin'::public.ensemble_role
FROM public.ensembles e
ON CONFLICT (ensemble_id, user_id) DO UPDATE SET role = 'admin';

CREATE OR REPLACE FUNCTION public.is_ensemble_admin(_ensemble uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ensemble_members WHERE ensemble_id = _ensemble AND user_id = _user AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.ensemble_member_section(_ensemble uuid, _user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT section_id FROM public.ensemble_members WHERE ensemble_id = _ensemble AND user_id = _user;
$$;

CREATE TABLE public.ensemble_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id uuid NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  email text,
  invitee_user_id uuid,
  role public.ensemble_role NOT NULL DEFAULT 'member',
  section_id uuid REFERENCES public.ensemble_sections(id) ON DELETE SET NULL,
  status public.invite_status NOT NULL DEFAULT 'pending',
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  CHECK (email IS NOT NULL OR invitee_user_id IS NOT NULL),
  CHECK (role <> 'section_member' OR section_id IS NOT NULL)
);
ALTER TABLE public.ensemble_invites ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ensemble_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ensemble_id uuid NOT NULL REFERENCES public.ensembles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.project_status NOT NULL DEFAULT 'planning',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ensemble_projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER ensemble_projects_updated_at BEFORE UPDATE ON public.ensemble_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.project_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ensemble_projects(id) ON DELETE CASCADE,
  type public.event_type NOT NULL,
  starts_at timestamptz NOT NULL,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ensemble_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  composer text,
  file_url text,
  score_id uuid REFERENCES public.scores(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_score_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_score_id uuid NOT NULL REFERENCES public.project_scores(id) ON DELETE CASCADE,
  assignee_type public.assignee_type NOT NULL,
  assignee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_score_id, assignee_type, assignee_id)
);
ALTER TABLE public.project_score_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_member(_project uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ensemble_projects p
    JOIN public.ensemble_members em ON em.ensemble_id = p.ensemble_id
    WHERE p.id = _project AND em.user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_admin(_project uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ensemble_projects p
    JOIN public.ensemble_members em ON em.ensemble_id = p.ensemble_id
    WHERE p.id = _project AND em.user_id = _user AND em.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_project_score(_pscore uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_scores ps
    JOIN public.ensemble_projects p ON p.id = ps.project_id
    JOIN public.ensemble_members em ON em.ensemble_id = p.ensemble_id AND em.user_id = _user
    WHERE ps.id = _pscore
      AND (
        em.role = 'admin'
        OR EXISTS (
          SELECT 1 FROM public.project_score_assignments a
          WHERE a.project_score_id = ps.id
            AND ((a.assignee_type = 'member' AND a.assignee_id = _user)
              OR (a.assignee_type = 'section' AND a.assignee_id = em.section_id))
        )
      )
  );
$$;

CREATE POLICY "Members view sections" ON public.ensemble_sections FOR SELECT TO authenticated USING (public.is_ensemble_member(ensemble_id, auth.uid()));
CREATE POLICY "Admins insert sections" ON public.ensemble_sections FOR INSERT TO authenticated WITH CHECK (public.is_ensemble_admin(ensemble_id, auth.uid()));
CREATE POLICY "Admins update sections" ON public.ensemble_sections FOR UPDATE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));
CREATE POLICY "Admins delete sections" ON public.ensemble_sections FOR DELETE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));

CREATE POLICY "Admins update members" ON public.ensemble_members FOR UPDATE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));
CREATE POLICY "Admins remove members" ON public.ensemble_members FOR DELETE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Invites visible to admin or invitee" ON public.ensemble_invites FOR SELECT TO authenticated
  USING (public.is_ensemble_admin(ensemble_id, auth.uid()) OR invitee_user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "Admins create invites" ON public.ensemble_invites FOR INSERT TO authenticated WITH CHECK (public.is_ensemble_admin(ensemble_id, auth.uid()) AND invited_by = auth.uid());
CREATE POLICY "Admins update invites" ON public.ensemble_invites FOR UPDATE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));
CREATE POLICY "Admins delete invites" ON public.ensemble_invites FOR DELETE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));

CREATE POLICY "Members view projects" ON public.ensemble_projects FOR SELECT TO authenticated USING (public.is_ensemble_member(ensemble_id, auth.uid()));
CREATE POLICY "Admins insert projects" ON public.ensemble_projects FOR INSERT TO authenticated WITH CHECK (public.is_ensemble_admin(ensemble_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins update projects" ON public.ensemble_projects FOR UPDATE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));
CREATE POLICY "Admins delete projects" ON public.ensemble_projects FOR DELETE TO authenticated USING (public.is_ensemble_admin(ensemble_id, auth.uid()));

CREATE POLICY "Members view events" ON public.project_events FOR SELECT TO authenticated USING (public.is_project_member(project_id, auth.uid()));
CREATE POLICY "Admins insert events" ON public.project_events FOR INSERT TO authenticated WITH CHECK (public.is_project_admin(project_id, auth.uid()));
CREATE POLICY "Admins update events" ON public.project_events FOR UPDATE TO authenticated USING (public.is_project_admin(project_id, auth.uid()));
CREATE POLICY "Admins delete events" ON public.project_events FOR DELETE TO authenticated USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "View project scores" ON public.project_scores FOR SELECT TO authenticated USING (public.can_view_project_score(id, auth.uid()));
CREATE POLICY "Admins insert project scores" ON public.project_scores FOR INSERT TO authenticated WITH CHECK (public.is_project_admin(project_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Admins update project scores" ON public.project_scores FOR UPDATE TO authenticated USING (public.is_project_admin(project_id, auth.uid()));
CREATE POLICY "Admins delete project scores" ON public.project_scores FOR DELETE TO authenticated USING (public.is_project_admin(project_id, auth.uid()));

CREATE POLICY "View assignments" ON public.project_score_assignments FOR SELECT TO authenticated USING (public.can_view_project_score(project_score_id, auth.uid()));
CREATE POLICY "Admins insert assignments" ON public.project_score_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.project_scores ps WHERE ps.id = project_score_id AND public.is_project_admin(ps.project_id, auth.uid())));
CREATE POLICY "Admins delete assignments" ON public.project_score_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.project_scores ps WHERE ps.id = project_score_id AND public.is_project_admin(ps.project_id, auth.uid())));

CREATE OR REPLACE FUNCTION public.accept_ensemble_invite(_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invite public.ensemble_invites%ROWTYPE;
  v_user uuid;
  v_email text;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user;
  SELECT * INTO v_invite FROM public.ensemble_invites WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF v_invite.status <> 'pending' THEN RAISE EXCEPTION 'Invite no longer valid'; END IF;
  IF v_invite.invitee_user_id IS NOT NULL AND v_invite.invitee_user_id <> v_user THEN
    RAISE EXCEPTION 'Invite is for a different user';
  END IF;
  IF v_invite.email IS NOT NULL AND lower(v_invite.email) <> lower(v_email) AND v_invite.invitee_user_id IS NULL THEN
    RAISE EXCEPTION 'Invite email does not match';
  END IF;
  INSERT INTO public.ensemble_members (ensemble_id, user_id, role, section_id)
  VALUES (v_invite.ensemble_id, v_user, v_invite.role, v_invite.section_id)
  ON CONFLICT (ensemble_id, user_id) DO UPDATE SET role = EXCLUDED.role, section_id = EXCLUDED.section_id;
  UPDATE public.ensemble_invites SET status = 'accepted', accepted_at = now(), invitee_user_id = v_user WHERE id = v_invite.id;
  RETURN v_invite.ensemble_id;
END;
$$;

CREATE POLICY "Ensemble members read project files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'scores' AND (storage.foldername(name))[1] = 'ensemble' AND public.is_ensemble_member(((storage.foldername(name))[2])::uuid, auth.uid()));
CREATE POLICY "Ensemble admins write project files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scores' AND (storage.foldername(name))[1] = 'ensemble' AND public.is_ensemble_admin(((storage.foldername(name))[2])::uuid, auth.uid()));
CREATE POLICY "Ensemble admins delete project files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'scores' AND (storage.foldername(name))[1] = 'ensemble' AND public.is_ensemble_admin(((storage.foldername(name))[2])::uuid, auth.uid()));