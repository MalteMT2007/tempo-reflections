import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, UserPlus, Trash2, X, FileText, Calendar, MapPin, Music2, Mail, Link2, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getEnsemble, listSections, createSection, renameSection, deleteSection,
  listMembers, updateMemberRole, removeMember,
  listInvites, revokeInvite,
  listProjects, createProject, updateProject, deleteProject,
  listEvents, createEvent, deleteEvent,
  listProjectScores, createProjectScore, deleteProjectScore, uploadProjectScoreFile, getProjectScoreSignedUrl,
  listAssignments, assignScore, unassignScore, listProjectsAssignedToUser,
  Ensemble, Section, MemberRow, Invite, Project, EventRow, ProjectScore, Assignment, EnsembleRole, ProjectStatus, EventType, EnsembleType,
} from "@/lib/ensembles";
import InviteMemberDialog from "@/components/ensemble/InviteMemberDialog";
import { RoleBadge } from "@/components/ensemble/RoleBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const TYPE_LABEL: Record<EnsembleType, string> = {
  orchestra: "Orchestra",
  band: "Band",
  choir: "Choir",
};

export default function EnsembleDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const nav = useNavigate();

  const [ensemble, setEnsemble] = useState<Ensemble | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [allowedProjectIds, setAllowedProjectIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("projects");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const me = members.find((m) => m.user_id === user?.id);
  const isAdmin = me?.role === "admin";

  const load = async () => {
    if (!id) return;
    const [e, s, m, i, p] = await Promise.all([
      getEnsemble(id), listSections(id), listMembers(id), listInvites(id).catch(() => []), listProjects(id),
    ]);
    setEnsemble(e); setSections(s); setMembers(m); setInvites(i); setProjects(p);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  // For non-admins, compute which projects they're allowed to see (assigned via section or directly).
  useEffect(() => {
    if (!id || !user) return;
    if (isAdmin) { setAllowedProjectIds(null); return; }
    listProjectsAssignedToUser(id, user.id).then(setAllowedProjectIds).catch(() => setAllowedProjectIds(new Set()));
  }, [id, user, isAdmin, projects.length]);

  useEffect(() => { document.title = ensemble ? `${ensemble.name} — Ensembles` : "Ensemble"; }, [ensemble]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>;
  if (!ensemble) return <div className="min-h-screen flex items-center justify-center text-ink-soft">Ensemble not found.</div>;

  const sectionName = (sid: string | null) => sections.find((s) => s.id === sid)?.name ?? null;
  const profileName = (uid: string) => {
    const m = members.find((x) => x.user_id === uid);
    return m?.profile?.display_name || m?.profile?.username || "User";
  };

  const visibleProjects = isAdmin || !allowedProjectIds
    ? projects
    : projects.filter((p) => allowedProjectIds.has(p.id));

  const eyebrow = ensemble.type ? TYPE_LABEL[ensemble.type] : "Ensemble";

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-6 pt-10">
        <Link to="/ensembles" className="inline-flex items-center gap-2 text-xs text-ink-soft hover:text-ink mb-6">
          <ArrowLeft className="h-3 w-3" /> Ensembles
        </Link>

        <header className="mb-8 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground mb-2">{eyebrow}</p>
            <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none truncate">{ensemble.name}</h1>
            {ensemble.description && <p className="mt-3 text-[14px] text-muted-foreground">{ensemble.description}</p>}
          </div>
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="Ensemble info"
            className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-ink-soft hover:text-ink hover:bg-card/60 transition"
          >
            <Info className="h-4 w-4" />
          </button>
        </header>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setActiveProjectId(null); }}>
          <TabsList className={`grid w-full mb-6 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">Settings</TabsTrigger>}
          </TabsList>

          <TabsContent value="members">
            <MembersTab
              ensembleId={id!} members={members} invites={invites} sections={sections}
              isAdmin={!!isAdmin} myId={user?.id ?? ""}
              onInviteClick={() => setInviteOpen(true)}
              onChange={load}
              sectionName={sectionName} profileName={profileName}
            />
          </TabsContent>

          <TabsContent value="projects">
            {activeProjectId ? (
              <ProjectDetail
                ensembleId={id!} projectId={activeProjectId} isAdmin={!!isAdmin}
                me={me} sections={sections} members={members} sectionName={sectionName} profileName={profileName}
                onBack={() => setActiveProjectId(null)}
                onChanged={load}
              />
            ) : (
              <ProjectsTab
                ensembleId={id!} projects={visibleProjects} isAdmin={!!isAdmin}
                onOpen={(pid) => setActiveProjectId(pid)} onChanged={load}
              />
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings">
              <SettingsTab ensembleId={id!} sections={sections} isAdmin={!!isAdmin} onChanged={load} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <InviteMemberDialog
        open={inviteOpen} onOpenChange={setInviteOpen}
        ensembleId={id!} sections={sections}
        onCreated={load}
      />

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">{eyebrow}</p>
            <DialogTitle className="text-[24px] font-semibold tracking-tight">{ensemble.name}</DialogTitle>
            {ensemble.description && <DialogDescription>{ensemble.description}</DialogDescription>}
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</p>
              <p className="text-3xl font-semibold tracking-tight mt-2">{members.length}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sections</p>
              <p className="text-3xl font-semibold tracking-tight mt-2">{sections.length}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projects</p>
              <p className="text-3xl font-semibold tracking-tight mt-2">{isAdmin ? projects.length : visibleProjects.length}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}



// ============== Members ==============
function MembersTab({
  ensembleId, members, invites, sections, isAdmin, myId,
  onInviteClick, onChange, sectionName, profileName,
}: any) {
  const pending = (invites as Invite[]).filter((i) => i.status === "pending");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Members <span className="text-ink-soft text-sm">· {members.length}</span></h2>
        {isAdmin && (
          <button onClick={onInviteClick} className="inline-flex items-center gap-2 bg-ink text-paper rounded-full px-4 py-2 text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Invite
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {(members as MemberRow[]).map((m) => (
          <li key={m.user_id} className="rounded-lg border border-border p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {m.profile?.avatar_url ? <img src={m.profile.avatar_url} alt="" className="h-full w-full object-cover" /> :
                <span className="text-xs text-ink-soft">{(m.profile?.display_name || m.profile?.username || "?")[0]?.toUpperCase()}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink truncate">{m.profile?.display_name || m.profile?.username || "Member"}</p>
              <p className="text-xs text-muted-foreground truncate">@{m.profile?.username}{m.profile?.instrument ? ` · ${m.profile.instrument}` : ""}</p>
            </div>
            <RoleBadge role={m.role} sectionName={sectionName(m.section_id)} />
            {isAdmin && (
              <MemberRoleEditor m={m} sections={sections} ensembleId={ensembleId} myId={myId} onChanged={onChange} />
            )}
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Pending invites</h3>
          <ul className="space-y-2">
            {pending.map((i) => (
              <li key={i.id} className="rounded-lg border border-dashed border-border p-3 flex items-center gap-3">
                <Mail className="h-4 w-4 text-ink-soft shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate">{i.email || (i.invitee_user_id ? profileName(i.invitee_user_id) : "Invitee")}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i.role === "admin" ? "Admin" : i.role === "section_member" ? `Section: ${sectionName(i.section_id) || "—"}` : "Member"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">Pending</Badge>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invites/${i.token}`).then(() => toast.success("Invite link copied"))}
                  className="text-ink-soft hover:text-ink p-1" title="Copy invite link">
                  <Link2 className="h-3.5 w-3.5" />
                </button>
                {isAdmin && (
                  <button onClick={async () => { await revokeInvite(i.id); toast.success("Revoked"); onChange(); }}
                    className="text-ink-soft hover:text-destructive p-1"><X className="h-3.5 w-3.5" /></button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function MemberRoleEditor({ m, sections, ensembleId, myId, onChanged }: { m: MemberRow; sections: Section[]; ensembleId: string; myId: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<EnsembleRole>(m.role);
  const [sectionId, setSectionId] = useState<string>(m.section_id ?? "");
  const isSelf = m.user_id === myId;
  const save = async () => {
    try {
      await updateMemberRole(ensembleId, m.user_id, role, role === "section_member" ? sectionId || null : null);
      toast.success("Updated"); setOpen(false); onChanged();
    } catch (e: any) { toast.error(e.message); }
  };
  const remove = async () => {
    if (!confirm("Remove member?")) return;
    try { await removeMember(ensembleId, m.user_id); toast.success("Removed"); setOpen(false); onChanged(); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-ink ml-1">Edit</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif text-xl">Edit member</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {(["admin", "member", "section_member"] as EnsembleRole[]).map((r) => (
              <button key={r} onClick={() => setRole(r)}
                className={`text-xs py-2 rounded-md border transition ${role === r ? "border-ink bg-ink text-paper" : "border-border text-ink-soft hover:text-ink"}`}>
                {r === "admin" ? "Admin" : r === "member" ? "Member" : "Section"}
              </button>
            ))}
          </div>
          {role === "section_member" && (
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm mt-2">
              <option value="">Choose section…</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isSelf && <button onClick={remove} className="text-xs text-destructive inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>}
            <div className="flex-1" />
            <button onClick={() => setOpen(false)} className="text-sm text-ink-soft px-3 py-2">Cancel</button>
            <button onClick={save} className="bg-ink text-paper rounded-full px-5 py-2 text-sm">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============== Projects ==============
function ProjectsTab({ ensembleId, projects, isAdmin, onOpen, onChanged }: any) {
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const submit = async () => {
    try { await createProject(ensembleId, { title: title.trim(), description: desc.trim() }); setTitle(""); setDesc(""); setCreating(false); onChanged(); toast.success("Project created"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">Projects</h2>
        {isAdmin && <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 bg-ink text-paper rounded-full px-4 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> New</button>}
      </div>
      {creating && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <Input autoFocus placeholder="Concert title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="text-sm text-ink-soft px-3 py-2">Cancel</button>
            <button onClick={submit} disabled={!title.trim()} className="bg-ink text-paper rounded-full px-4 py-2 text-sm disabled:opacity-40">Create</button>
          </div>
        </div>
      )}
      {projects.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Music2 className="h-6 w-6 text-ink-soft mx-auto mb-2" />
          <p className="font-serif italic text-ink-soft">No projects yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(projects as Project[]).map((p) => (
            <li key={p.id}>
              <button onClick={() => onOpen(p.id)} className="w-full text-left rounded-lg border border-border p-4 hover:bg-card/50 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-lg text-ink truncate">{p.title}</p>
                    {p.description && <p className="text-sm text-ink-soft truncate">{p.description}</p>}
                  </div>
                  <Badge variant="outline" className="capitalize shrink-0">{p.status}</Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectDetail({ ensembleId, projectId, isAdmin, me, sections, members, sectionName, profileName, onBack, onChanged }: any) {
  const [project, setProject] = useState<Project | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [scores, setScores] = useState<ProjectScore[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addScoreOpen, setAddScoreOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<ProjectScore | null>(null);

  const reload = async () => {
    const [p, e, s, a] = await Promise.all([
      (await import("@/lib/ensembles")).getProject(projectId),
      listEvents(projectId), listProjectScores(projectId), listAssignments(projectId),
    ]);
    setProject(p); setEvents(e); setScores(s); setAssignments(a);
  };
  useEffect(() => { reload(); }, [projectId]);

  if (!project) return <div className="py-10 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-ink-soft" /></div>;

  const updateStatus = async (status: ProjectStatus) => {
    await updateProject(projectId, { status }); setProject({ ...project, status }); onChanged();
  };
  const removeProject = async () => {
    if (!confirm("Delete this project and all its events/scores?")) return;
    await deleteProject(projectId); toast.success("Deleted"); onBack(); onChanged();
  };

  const assignmentsFor = (sid: string) => assignments.filter((a) => a.project_score_id === sid);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-xs text-ink-soft hover:text-ink inline-flex items-center gap-2">
        <ArrowLeft className="h-3 w-3" /> Projects
      </button>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink">{project.title}</h2>
            {project.description && <p className="text-sm text-ink-soft mt-1">{project.description}</p>}
          </div>
          {isAdmin && (
            <select value={project.status} onChange={(e) => updateStatus(e.target.value as ProjectStatus)}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs capitalize">
              <option value="planning">Planning</option>
              <option value="rehearsing">Rehearsing</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>
      </div>

      {/* Events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-ink">Events</h3>
          {isAdmin && <button onClick={() => setAddEventOpen(true)} className="text-xs inline-flex items-center gap-1 text-ink-soft hover:text-ink"><Plus className="h-3 w-3" /> Add</button>}
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No events yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <div className="text-center shrink-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(e.starts_at).toLocaleDateString(undefined, { month: "short" })}</p>
                    <p className="font-serif text-2xl text-ink leading-none">{new Date(e.starts_at).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={e.type === "concert" ? "default" : "secondary"} className="capitalize text-[10px]">{e.type}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(e.starts_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {e.location && <p className="text-sm text-ink-soft mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</p>}
                    {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                  </div>
                  {isAdmin && <button onClick={async () => { await deleteEvent(e.id); reload(); }} className="text-ink-soft hover:text-destructive"><X className="h-3.5 w-3.5" /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Scores */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-ink">Sheet music</h3>
          {isAdmin && <button onClick={() => setAddScoreOpen(true)} className="text-xs inline-flex items-center gap-1 text-ink-soft hover:text-ink"><Plus className="h-3 w-3" /> Add</button>}
        </div>
        {scores.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No sheet music yet.</p>
        ) : (
          <ul className="space-y-2">
            {scores.map((s) => {
              const aa = assignmentsFor(s.id);
              return (
                <li key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-ink-soft mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{s.title}</p>
                      {s.composer && <p className="text-xs text-muted-foreground">{s.composer}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {aa.map((a) => (
                          <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full border border-border text-ink-soft">
                            {a.assignee_type === "section" ? sectionName(a.assignee_id) || "Section" : profileName(a.assignee_id)}
                          </span>
                        ))}
                        {aa.length === 0 && <span className="text-[10px] text-muted-foreground italic">Unassigned</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {s.file_url && (
                        <button onClick={async () => {
                          try { const url = await getProjectScoreSignedUrl(s.file_url!); window.open(url, "_blank"); }
                          catch (e: any) { toast.error(e.message); }
                        }} className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-ink">Open</button>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={() => setAssignTarget(s)} className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-ink">Assign</button>
                          <button onClick={async () => { if (confirm("Delete?")) { await deleteProjectScore(s.id); reload(); } }} className="text-ink-soft hover:text-destructive"><X className="h-3 w-3" /></button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isAdmin && (
        <button onClick={removeProject} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
          <Trash2 className="h-3 w-3" /> Delete project
        </button>
      )}

      <AddEventDialog open={addEventOpen} onOpenChange={setAddEventOpen} projectId={projectId} onAdded={reload} />
      <AddScoreDialog open={addScoreOpen} onOpenChange={setAddScoreOpen} ensembleId={ensembleId} projectId={projectId} onAdded={reload} />
      {assignTarget && (
        <AssignDialog
          open={!!assignTarget} onOpenChange={(o) => !o && setAssignTarget(null)}
          score={assignTarget} sections={sections} members={members}
          existing={assignmentsFor(assignTarget.id)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

function AddEventDialog({ open, onOpenChange, projectId, onAdded }: any) {
  const [type, setType] = useState<EventType>("rehearsal");
  const [date, setDate] = useState(""); const [time, setTime] = useState("");
  const [location, setLocation] = useState(""); const [notes, setNotes] = useState("");
  useEffect(() => { if (!open) { setDate(""); setTime(""); setLocation(""); setNotes(""); setType("rehearsal"); } }, [open]);
  const submit = async () => {
    if (!date) return;
    const starts = new Date(`${date}T${time || "19:00"}`).toISOString();
    try { await createEvent(projectId, { type, starts_at: starts, location, notes }); onOpenChange(false); onAdded(); toast.success("Event added"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-xl">Add event</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setType("rehearsal")} className={`text-xs py-2 rounded-md border ${type === "rehearsal" ? "border-ink bg-ink text-paper" : "border-border"}`}>Rehearsal</button>
          <button onClick={() => setType("concert")} className={`text-xs py-2 rounded-md border ${type === "concert" ? "border-ink bg-ink text-paper" : "border-border"}`}>Concert</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <Input placeholder="Location / venue" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="text-sm text-ink-soft px-3 py-2">Cancel</button>
          <button onClick={submit} disabled={!date} className="bg-ink text-paper rounded-full px-5 py-2 text-sm disabled:opacity-40">Add</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddScoreDialog({ open, onOpenChange, ensembleId, projectId, onAdded }: any) {
  const [title, setTitle] = useState(""); const [composer, setComposer] = useState("");
  const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) { setTitle(""); setComposer(""); setFile(null); } }, [open]);
  const submit = async () => {
    setBusy(true);
    try {
      let path: string | undefined;
      if (file) path = await uploadProjectScoreFile(ensembleId, projectId, file);
      await createProjectScore(projectId, { title: title.trim(), composer, file_url: path });
      onOpenChange(false); onAdded(); toast.success("Score added");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-xl">Add sheet music</DialogTitle></DialogHeader>
        <Input autoFocus placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Composer (optional)" value={composer} onChange={(e) => setComposer(e.target.value)} />
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">PDF (optional)</label>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="text-sm text-ink-soft px-3 py-2">Cancel</button>
          <button onClick={submit} disabled={!title.trim() || busy} className="bg-ink text-paper rounded-full px-5 py-2 text-sm disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ open, onOpenChange, score, sections, members, existing, onChanged }: any) {
  const isAssignedSection = (id: string) => existing.some((a: Assignment) => a.assignee_type === "section" && a.assignee_id === id);
  const isAssignedMember = (id: string) => existing.some((a: Assignment) => a.assignee_type === "member" && a.assignee_id === id);
  const toggleSection = async (id: string) => {
    const ex = existing.find((a: Assignment) => a.assignee_type === "section" && a.assignee_id === id);
    if (ex) await unassignScore(ex.id); else await assignScore(score.id, "section", id);
    onChanged();
  };
  const toggleMember = async (id: string) => {
    const ex = existing.find((a: Assignment) => a.assignee_type === "member" && a.assignee_id === id);
    if (ex) await unassignScore(ex.id); else await assignScore(score.id, "member", id);
    onChanged();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Assign "{score.title}"</DialogTitle>
          <DialogDescription>Toggle sections or individual members.</DialogDescription>
        </DialogHeader>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sections</p>
          <div className="flex flex-wrap gap-1.5">
            {sections.length === 0 && <span className="text-xs text-muted-foreground italic">No sections</span>}
            {sections.map((s: Section) => (
              <button key={s.id} onClick={() => toggleSection(s.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${isAssignedSection(s.id) ? "border-ink bg-ink text-paper" : "border-border text-ink-soft"}`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 mt-2">Members</p>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m: MemberRow) => (
              <button key={m.user_id} onClick={() => toggleMember(m.user_id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${isAssignedMember(m.user_id) ? "border-ink bg-ink text-paper" : "border-border text-ink-soft"}`}>
                {m.profile?.display_name || m.profile?.username || "Member"}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter><button onClick={() => onOpenChange(false)} className="bg-ink text-paper rounded-full px-5 py-2 text-sm">Done</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Settings ==============
function SettingsTab({ ensembleId, sections, isAdmin, onChanged }: any) {
  const [name, setName] = useState("");
  const add = async () => { if (!name.trim()) return; try { await createSection(ensembleId, name.trim()); setName(""); onChanged(); } catch (e: any) { toast.error(e.message); } };
  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-serif text-xl text-ink mb-3">Sections</h2>
        <p className="text-xs text-ink-soft mb-3">Used when assigning members and sheet music. Each ensemble has its own list.</p>
        {isAdmin && (
          <div className="flex gap-2 mb-3">
            <Input placeholder='e.g. "First Violin"' value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
            <button onClick={add} disabled={!name.trim()} className="bg-ink text-paper rounded-full px-4 text-sm disabled:opacity-40">Add</button>
          </div>
        )}
        {sections.length === 0 ? <p className="text-sm text-ink-soft italic">No sections yet.</p> : (
          <ul className="space-y-1">
            {(sections as Section[]).map((s) => <SectionRow key={s.id} section={s} isAdmin={isAdmin} onChanged={onChanged} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionRow({ section, isAdmin, onChanged }: { section: Section; isAdmin: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false); const [name, setName] = useState(section.name);
  const save = async () => { try { await renameSection(section.id, name.trim()); setEditing(false); onChanged(); } catch (e: any) { toast.error(e.message); } };
  const remove = async () => { if (!confirm("Delete section?")) return; try { await deleteSection(section.id); onChanged(); } catch (e: any) { toast.error(e.message); } };
  return (
    <li className="rounded-md border border-border p-3 flex items-center gap-2">
      {editing ? <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" /> :
        <span className="flex-1 text-sm text-ink">{section.name}</span>}
      {isAdmin && (editing ? (
        <>
          <button onClick={save} className="text-xs text-ink hover:underline">Save</button>
          <button onClick={() => { setEditing(false); setName(section.name); }} className="text-xs text-ink-soft">Cancel</button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="text-[10px] uppercase tracking-wider text-ink-soft hover:text-ink">Rename</button>
          <button onClick={remove} className="text-ink-soft hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
        </>
      ))}
    </li>
  );
}
