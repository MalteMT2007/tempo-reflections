# Ensembles v2 — Plan

Build a full ensemble management layer on top of the existing `ensembles` + `ensemble_members` tables. Adds roles, sections, projects, events, project-scoped sheet music with per-section/per-member assignments, and an invite flow.

## 1. Database (one migration)

New enums:
- `ensemble_role`: `admin`, `member`, `section_member`
- `project_status`: `planning`, `rehearsing`, `completed`
- `event_type`: `rehearsal`, `concert`
- `invite_status`: `pending`, `accepted`, `revoked`
- `assignee_type`: `section`, `member`

Schema changes:
- `ensemble_members`: add `role ensemble_role default 'member'`, `section_id uuid null`. Migrate existing `role text` ('creator','member') → `'admin'`/`'member'`. Creator stays `admin`.
- New `ensemble_sections (id, ensemble_id, name, created_at)`
- New `ensemble_invites (id, ensemble_id, email nullable, invitee_user_id nullable, role, section_id nullable, status, token uuid unique, invited_by, created_at, accepted_at)` — supports both email and direct username invites
- New `ensemble_projects (id, ensemble_id, title, description, status, created_by, created_at, updated_at)`
- New `project_events (id, project_id, type, starts_at timestamptz, location, notes, created_at)`
- New `project_scores (id, project_id, title, composer, file_url, score_id nullable → existing scores, created_by, created_at)` — separate from personal `scores` library; can optionally link
- New `project_score_assignments (id, project_score_id, assignee_type, assignee_id)` — `assignee_id` references either `ensemble_sections.id` or `auth.users.id` depending on type

Security definer helpers (avoid RLS recursion):
- `is_ensemble_admin(_ensemble uuid, _user uuid) returns boolean`
- `ensemble_member_section(_ensemble uuid, _user uuid) returns uuid`
- `can_view_project_score(_pscore uuid, _user uuid) returns boolean` — true if admin, or assigned to user's section, or assigned to user directly

RLS:
- Sections/projects/events: members can SELECT; only admins INSERT/UPDATE/DELETE
- Project scores: admins see all; members see only assigned; admins manage
- Invites: admin can manage; invitee (by matching email or user_id) can SELECT and UPDATE own
- Backfill: existing `created_by` becomes `admin` in `ensemble_members`

## 2. API layer (`src/lib/ensembles.ts` — new file)

Centralized functions: `getEnsemble`, `listSections/createSection/renameSection/deleteSection`, `listMembers` (with profile join + role + section), `updateMemberRole`, `removeMember`, `listInvites/createInvite/acceptInvite/revokeInvite`, `listProjects/createProject/updateProject`, `listEvents/createEvent/deleteEvent`, `listProjectScores/createProjectScore/assignScore/unassignScore`, `uploadProjectScoreFile`.

Storage: reuse `scores` bucket; project files at `ensemble/{ensembleId}/{projectId}/{filename}`. Add policy allowing ensemble members to read, admins to write.

## 3. Routes & UI

- New route `/ensembles/:id` → `EnsembleDetail.tsx` with tabs (shadcn `Tabs`): **Overview**, **Members**, **Projects**, **Settings**
- `Ensembles.tsx` list page links each card to `/ensembles/:id`
- Modal: `InviteMemberDialog` — toggle email vs colleague (search `profiles`), pick role, pick section (required if `section_member`)
- Components: `MembersTab`, `ProjectsTab`, `ProjectDetail` (events list + scores list), `SettingsTab` (sections CRUD + ensemble metadata + leave/delete), `RoleBadge`, `SectionBadge`, `AssignmentChips`, `AddEventDialog`, `AddProjectScoreDialog`, `AssignScoreDialog`
- Invite acceptance: route `/invites/:token` → calls `acceptInvite`, redirects to ensemble. Email link is optional for now (we surface pending invites in-app under a new "Invites" entry on the home/AppMenu).

## 4. UX details

- Role badges on every member card: "Admin" / "Member" / section name (for section members)
- Pending invites listed in Members tab with revoke button + status pill
- Score cards show chips of assignments
- Members only see scores assigned to them or their section; admins see all (enforced both client-side and via RLS)
- Empty states throughout, consistent with the existing serif/paper aesthetic

## 5. Out of scope (this round)

- Actually sending invite emails (just generate token + show shareable link / list pending). Easy to add later via Lovable Emails.
- Realtime updates
- Calendar view (timeline = vertical chronological list)

## Technical notes

- Store both date and time as a single `timestamptz starts_at` for events to keep sorting trivial.
- `project_score_assignments.assignee_id` is a plain uuid (no FK) since it polymorphically points to sections or users; integrity enforced by triggers/checks.
- `accept_invite(token)` implemented as a SECURITY DEFINER RPC: validates token, inserts `ensemble_members` row with role+section, marks invite accepted. Avoids needing the invitee to have direct insert rights on `ensemble_members`.
