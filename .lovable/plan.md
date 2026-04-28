# Redesign: Apple-style + Spaces social hub

## 1. Typography (global)
Update `src/index.css` and `tailwind.config.ts`:
- Set `--font-sans` and Tailwind `fontFamily.sans` to: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`
- Remove any serif/display fonts (Playfair, etc.) from imports and config
- Apply to `body` so every component inherits

## 2. Navigation — 5 tabs, sidebar-first

Replace current `AppMenu` with a new `AppSidebar` (shadcn sidebar, `collapsible="icon"`) with 5 routes:

| Tab | Route | Purpose |
|---|---|---|
| Practise | `/practise` | personal practice (scores + annotations) |
| Ensemble | `/ensembles` | existing ensembles list/detail |
| Library | `/library` | personal sheet music library |
| Spaces | `/spaces` | social hub (Colabrate + Rooms) |
| Profile | `/profile` | profile & settings |

- Sidebar visible on `md+` (iPad/desktop), drawer on mobile via `SidebarTrigger`
- Update `App.tsx` to wrap routes in `SidebarProvider` + `AppSidebar` layout
- Map current `Index` → `Practise`, current `Scores` → `Library`

## 3. Spaces — combined social hub

Single page `/spaces` with a segmented control at top: **Discover** | **Rooms**.

### Discover (Colabrate feed)
- Twitter-style feed of short posts (text, max ~500 chars)
- Like, comment, repost actions
- Default tab "Following" (posts from followed users) + "All" tab
- Compose button → modal to write a new post
- "Colabrate" spelled exactly like this in UI labels

### Rooms
Two-column iPad layout: rooms list (left) + active room messages (right).
- **Discover rooms**: searchable list of public rooms (name, description, member count, Join button)
- **My rooms**: rooms the user has joined
- **Create room**: name, description, optional avatar, public/private toggle
- **Inside a room**: messages with avatar, display name, timestamp; composer at bottom
- **Invites**: admins can invite by username search; invitee gets a row in `room_invites` and accepts/declines from a notifications area inside Rooms
- **Leave room** button
- Private rooms hidden from search; joinable only via invite

## 4. Database (new tables, all RLS-protected)

```text
posts(id, author_id, content, created_at)
post_likes(post_id, user_id, created_at)   PK(post_id, user_id)
post_comments(id, post_id, author_id, content, created_at)
post_reposts(post_id, user_id, created_at) PK(post_id, user_id)

rooms(id, name, description, avatar_url, is_public, created_by, created_at)
room_members(room_id, user_id, role: 'admin'|'member', joined_at) PK(room_id, user_id)
room_messages(id, room_id, author_id, content, created_at)
room_invites(id, room_id, invitee_id, invited_by, status: 'pending'|'accepted'|'declined', created_at)
```

Helper SECURITY DEFINER fn: `is_room_member(room_id, user_id)`, `is_room_admin(room_id, user_id)`.

RLS highlights:
- `posts`: select for authenticated; insert/update/delete by author
- `post_likes/comments/reposts`: select for authenticated; insert/delete by self
- `rooms`: select if `is_public` OR member; insert by creator; update/delete by admin
- `room_members`: select if member; insert by self for public rooms or via accepted invite; delete by self or admin
- `room_messages`: select/insert if `is_room_member`
- `room_invites`: select by invitee or room admin; insert by admin; update by invitee
- Trigger: on `rooms` insert, add creator as `admin` member

Realtime enabled on `room_messages` and `posts` for live feed.

## 5. New files
- `src/components/AppSidebar.tsx` — 5-tab sidebar
- `src/layouts/AppLayout.tsx` — sidebar provider + outlet
- `src/pages/Practise.tsx` — rename/repoint of Index
- `src/pages/Library.tsx` — personal scores library
- `src/pages/Spaces.tsx` — segmented Discover/Rooms shell
- `src/components/spaces/ColabrateFeed.tsx`
- `src/components/spaces/ComposePost.tsx`
- `src/components/spaces/PostCard.tsx`
- `src/components/spaces/RoomsPanel.tsx` (list + create + search)
- `src/components/spaces/RoomView.tsx` (messages + composer + invites)
- `src/components/spaces/CreateRoomDialog.tsx`
- `src/components/spaces/InviteToRoomDialog.tsx`
- `src/lib/social.ts` — API helpers for posts, rooms, messages, invites

## 6. Edited files
- `src/index.css`, `tailwind.config.ts` — Apple system font
- `src/App.tsx` — new layout + routes
- `src/integrations/supabase/types.ts` — regenerated after migration

## Out of scope
- Push notifications (in-app notification badge only)
- Image/file uploads in posts and messages (text-only v1)
- Threaded replies to comments (flat comments)
