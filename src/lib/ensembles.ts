import { supabase } from "@/integrations/supabase/client";

export type EnsembleRole = "admin" | "member" | "section_member";
export type ProjectStatus = "planning" | "rehearsing" | "completed";
export type EventType = "rehearsal" | "concert";
export type InviteStatus = "pending" | "accepted" | "revoked";
export type AssigneeType = "section" | "member";

export type Ensemble = {
  id: string; name: string; description: string | null;
  created_by: string; created_at: string; updated_at: string;
};

export type Section = { id: string; ensemble_id: string; name: string; created_at: string };

export type MemberRow = {
  ensemble_id: string;
  user_id: string;
  role: EnsembleRole;
  section_id: string | null;
  joined_at: string;
  profile?: { username: string; display_name: string | null; avatar_url: string | null; instrument: string | null } | null;
};

export type Invite = {
  id: string; ensemble_id: string;
  email: string | null; invitee_user_id: string | null;
  role: EnsembleRole; section_id: string | null;
  status: InviteStatus; token: string;
  invited_by: string; created_at: string; accepted_at: string | null;
};

export type Project = {
  id: string; ensemble_id: string; title: string;
  description: string | null; status: ProjectStatus;
  created_by: string; created_at: string; updated_at: string;
};

export type EventRow = {
  id: string; project_id: string; type: EventType;
  starts_at: string; location: string | null; notes: string | null;
};

export type ProjectScore = {
  id: string; project_id: string; title: string;
  composer: string | null; file_url: string | null;
  score_id: string | null; created_by: string; created_at: string;
};

export type Assignment = {
  id: string; project_score_id: string;
  assignee_type: AssigneeType; assignee_id: string;
};

// ===== Ensembles =====
export async function getEnsemble(id: string): Promise<Ensemble | null> {
  const { data, error } = await supabase.from("ensembles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as any;
}

// ===== Sections =====
export async function listSections(ensembleId: string): Promise<Section[]> {
  const { data, error } = await supabase.from("ensemble_sections").select("*").eq("ensemble_id", ensembleId).order("name");
  if (error) throw error;
  return (data ?? []) as any;
}
export async function createSection(ensembleId: string, name: string) {
  const { error } = await supabase.from("ensemble_sections").insert({ ensemble_id: ensembleId, name });
  if (error) throw error;
}
export async function renameSection(id: string, name: string) {
  const { error } = await supabase.from("ensemble_sections").update({ name }).eq("id", id);
  if (error) throw error;
}
export async function deleteSection(id: string) {
  const { error } = await supabase.from("ensemble_sections").delete().eq("id", id);
  if (error) throw error;
}

// ===== Members =====
export async function listMembers(ensembleId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("ensemble_members")
    .select("ensemble_id, user_id, role, section_id, joined_at")
    .eq("ensemble_id", ensembleId);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  const ids = rows.map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, instrument")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
}
export async function updateMemberRole(ensembleId: string, userId: string, role: EnsembleRole, sectionId: string | null) {
  const { error } = await supabase.from("ensemble_members")
    .update({ role, section_id: role === "section_member" ? sectionId : null })
    .eq("ensemble_id", ensembleId).eq("user_id", userId);
  if (error) throw error;
}
export async function removeMember(ensembleId: string, userId: string) {
  const { error } = await supabase.from("ensemble_members").delete().eq("ensemble_id", ensembleId).eq("user_id", userId);
  if (error) throw error;
}

// ===== Invites =====
export async function listInvites(ensembleId: string): Promise<Invite[]> {
  const { data, error } = await supabase.from("ensemble_invites").select("*")
    .eq("ensemble_id", ensembleId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}
export async function createInvite(input: {
  ensembleId: string;
  email?: string | null;
  inviteeUserId?: string | null;
  role: EnsembleRole;
  sectionId?: string | null;
}): Promise<Invite> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase.from("ensemble_invites").insert({
    ensemble_id: input.ensembleId,
    email: input.email ?? null,
    invitee_user_id: input.inviteeUserId ?? null,
    role: input.role,
    section_id: input.sectionId ?? null,
    invited_by: user.id,
  }).select().single();
  if (error) throw error;
  return data as any;
}
export async function revokeInvite(id: string) {
  const { error } = await supabase.from("ensemble_invites").update({ status: "revoked" }).eq("id", id);
  if (error) throw error;
}
export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_ensemble_invite", { _token: token });
  if (error) throw error;
  return data as string;
}
export async function listMyPendingInvites(): Promise<(Invite & { ensemble?: { name: string } | null })[]> {
  const { data, error } = await supabase.from("ensemble_invites").select("*").eq("status", "pending");
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map(r => r.ensemble_id)));
  const { data: ens } = await supabase.from("ensembles").select("id, name").in("id", ids);
  const map = new Map<string, any>();
  for (const e of (ens ?? []) as any[]) map.set(e.id, e);
  return rows.map(r => ({ ...r, ensemble: map.get(r.ensemble_id) ?? null }));
}
export async function declineEnsembleInvite(id: string) {
  const { error } = await supabase.from("ensemble_invites").update({ status: "declined" as any }).eq("id", id);
  if (error) throw error;
}

export type ResolvedEnsembleInvite = {
  id: string;
  ensemble_id: string;
  status: "accepted" | "declined";
  role: string;
  created_at: string;
  accepted_at: string | null;
  ensemble?: { name: string } | null;
};

export async function listMyResolvedInvites(days = 30): Promise<ResolvedEnsembleInvite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("ensemble_invites")
    .select("id, ensemble_id, status, role, created_at, accepted_at, invitee_user_id, email")
    .in("status", ["accepted", "declined"] as any)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // RLS allows admins to see invites they sent — keep only invites addressed to me.
  const myEmail = user.email?.toLowerCase() ?? "";
  const rows = (data ?? []).filter((r: any) =>
    r.invitee_user_id === user.id || (r.email && r.email.toLowerCase() === myEmail)
  ) as any[];
  if (!rows.length) return [];
  const ids = Array.from(new Set(rows.map((r) => r.ensemble_id)));
  const { data: ens } = await supabase.from("ensembles").select("id, name").in("id", ids);
  const map = new Map<string, any>();
  for (const e of (ens ?? []) as any[]) map.set(e.id, e);
  return rows.map((r) => ({
    id: r.id,
    ensemble_id: r.ensemble_id,
    status: r.status,
    role: r.role,
    created_at: r.created_at,
    accepted_at: r.accepted_at,
    ensemble: map.get(r.ensemble_id) ?? null,
  }));
}

// ===== Projects =====
export async function listProjects(ensembleId: string): Promise<Project[]> {
  const { data, error } = await supabase.from("ensemble_projects").select("*")
    .eq("ensemble_id", ensembleId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}
export async function createProject(ensembleId: string, input: { title: string; description?: string; status?: ProjectStatus }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase.from("ensemble_projects").insert({
    ensemble_id: ensembleId, title: input.title, description: input.description || null,
    status: input.status ?? "planning", created_by: user.id,
  }).select().single();
  if (error) throw error;
  return data as Project;
}
export async function updateProject(id: string, patch: Partial<Pick<Project, "title" | "description" | "status">>) {
  const { error } = await supabase.from("ensemble_projects").update(patch).eq("id", id);
  if (error) throw error;
}
export async function deleteProject(id: string) {
  const { error } = await supabase.from("ensemble_projects").delete().eq("id", id);
  if (error) throw error;
}
export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("ensemble_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as any;
}

// ===== Events =====
export async function listEvents(projectId: string): Promise<EventRow[]> {
  const { data, error } = await supabase.from("project_events").select("*")
    .eq("project_id", projectId).order("starts_at");
  if (error) throw error;
  return (data ?? []) as any;
}
export async function createEvent(projectId: string, input: { type: EventType; starts_at: string; location?: string; notes?: string }) {
  const { error } = await supabase.from("project_events").insert({
    project_id: projectId, type: input.type, starts_at: input.starts_at,
    location: input.location || null, notes: input.notes || null,
  });
  if (error) throw error;
}
export async function deleteEvent(id: string) {
  const { error } = await supabase.from("project_events").delete().eq("id", id);
  if (error) throw error;
}

// ===== Project scores =====
export async function listProjectScores(projectId: string): Promise<ProjectScore[]> {
  const { data, error } = await supabase.from("project_scores").select("*")
    .eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}
export async function createProjectScore(projectId: string, input: { title: string; composer?: string; file_url?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase.from("project_scores").insert({
    project_id: projectId, title: input.title,
    composer: input.composer || null, file_url: input.file_url || null,
    created_by: user.id,
  }).select().single();
  if (error) throw error;
  return data as ProjectScore;
}
export async function deleteProjectScore(id: string) {
  const { error } = await supabase.from("project_scores").delete().eq("id", id);
  if (error) throw error;
}
export async function uploadProjectScoreFile(ensembleId: string, projectId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `ensemble/${ensembleId}/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("scores").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
export async function getProjectScoreSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("scores").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ===== Assignments =====
export async function listAssignments(projectId: string): Promise<Assignment[]> {
  const { data: scores } = await supabase.from("project_scores").select("id").eq("project_id", projectId);
  const ids = (scores ?? []).map((s: any) => s.id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("project_score_assignments").select("*").in("project_score_id", ids);
  if (error) throw error;
  return (data ?? []) as any;
}
export async function assignScore(projectScoreId: string, assignee_type: AssigneeType, assignee_id: string) {
  const { error } = await supabase.from("project_score_assignments")
    .insert({ project_score_id: projectScoreId, assignee_type, assignee_id });
  if (error) throw error;
}
export async function unassignScore(id: string) {
  const { error } = await supabase.from("project_score_assignments").delete().eq("id", id);
  if (error) throw error;
}
