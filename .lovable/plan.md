## Goal

After the previous fix makes the bell clear when "all caught up," the Inbox shouldn't go completely empty — it should still show a "Read" history section underneath unread items so the user can revisit recent conversations and resolved invites.

## Behavior

- **Top section: Unread** — same as today (unread DMs, pending ensemble invites, pending room invites). Empty-state message ("All caught up.") only when there are also no read items.
- **Below it: Read · last 30 days** — a separate section in muted/dimmed styling containing:
  - Read DM conversations (most recent message in the last 30 days, no red dot).
  - Resolved ensemble invites with a small `Accepted` / `Declined` label.
  - Resolved room invites with the same label.
- Sections are sorted by most recent activity descending. Tapping a read DM still navigates to `/messages/:other_id`. Resolved invites are non-actionable (no Accept/Decline buttons), just informational.

## Implementation

### 1. New data helpers

**`src/lib/messages.ts`** — add `listRecentReadConversations(days = 30)`:
- Selects all messages where the user is sender OR recipient, in the last 30 days.
- For messages where user is recipient, only include those with `read_at IS NOT NULL`.
- Group by "other party" id, take the most recent message as the preview.
- Exclude conversations that already have unread messages (those are in the Unread section).
- Join `profiles` for display name/avatar.

**`src/lib/ensembles.ts`** — add `listMyResolvedInvites(days = 30)`:
- Returns ensemble invites with `status IN ('accepted','declined')` updated/created in the last 30 days, joined with `ensembles(name)`. RLS already restricts to admin or invitee — we further filter client-side to invitee-only so admins don't see invites they sent.

**`src/lib/social.ts`** — add `listMyResolvedRoomInvites(days = 30)`:
- Returns room invites for the current user (`invitee_id = me`) where `status IN ('accepted','declined')` and `responded_at >= now() - 30 days`, joined with `rooms(name, avatar_url)`.

### 2. Inbox UI (`src/pages/Inbox.tsx`)

- Fetch the three new "read" lists in parallel alongside the existing three "unread" lists.
- Render structure:
  ```
  <Unread items as today>
  
  --- "Recent" header (only shown when read items exist) ---
  
  <Read DMs — dimmed avatar, no red dot>
  <Resolved ensemble invites — name + "Accepted"/"Declined" pill>
  <Resolved room invites — same>
  ```
- Empty-state ("All caught up.") only when unread total == 0 AND read list is also empty.
- Read items use existing `glass` card style but with `opacity-70` / muted text colors so they read as history.
- Add the same realtime subscriptions to refresh history when invites or DMs change.

### 3. No schema changes needed

All filtering is done with existing columns (`read_at`, `status`, `responded_at`, `created_at`). RLS already permits viewing these rows. No migration required.

## Files touched

- `src/lib/messages.ts` — new `listRecentReadConversations`.
- `src/lib/ensembles.ts` — new `listMyResolvedInvites`.
- `src/lib/social.ts` — new `listMyResolvedRoomInvites`.
- `src/pages/Inbox.tsx` — fetch + render the Read section.
