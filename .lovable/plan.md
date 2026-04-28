# Liquid Glass Redesign — Apple iOS 26 Aesthetic

Transform the app into a native-feeling Apple experience with frosted glass surfaces, system typography, minimal chrome, and a Colleagues tab.

## 1. Foundation — Design tokens & global styles

**`src/index.css`**
- Replace background with a fixed, full-viewport blurred gradient mesh (deep purple → indigo → blue) so glass surfaces bleed correctly. Layer two radial gradients + one linear gradient for depth.
- New semantic tokens (HSL):
  - `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-shadow`
  - `--mesh-1`, `--mesh-2`, `--mesh-3` (gradient stops)
  - Re-tune `--background`, `--card`, `--popover`, `--border`, `--muted` so shadcn primitives inherit the glass look.
- Force `font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif` on `html, body`.
- Reusable utilities:
  - `.glass` — `backdrop-blur-2xl bg-[hsl(var(--glass-bg))] border border-[hsl(var(--glass-border))]`
  - `.glass-strong` — heavier blur for sidebar/modals
  - `.glass-button` — translucent fill, subtle border, no solid color
  - `.spring-tap` — `active:scale-95 transition-transform`
- Dark mode = default (Apple-like). Light mode tokens kept but de-emphasized.

**`tailwind.config.ts`**
- Map new tokens. Add `backdropBlur.3xl`, spring-style transition timing, and `animate-fade-in` / `animate-scale-in` already present.

## 2. Sidebar — Glass, icons + short labels

**`src/components/AppSidebar.tsx`**
- Apply `.glass-strong` background, remove solid border, use a hairline `rgba(255,255,255,0.12)` divider.
- Tabs: Practise · Ensemble · Library · Spaces · **Colleagues** · Profile (Inbox stays accessible via a small badge icon in the header — see §6).
- Active item: pill with `bg-white/10`, no heavy color fill. Icons render at 20px, labels in 13px medium.
- Collapsed state keeps icon-only mini rail.

**`src/layouts/AppLayout.tsx`**
- Header becomes a thin glass bar (no border, just blur). Sidebar trigger + Inbox icon (with dot badge) + avatar.
- Main content gets generous padding (`px-6 md:px-10 py-8 md:py-12`).

## 3. Colleagues tab (new)

Reuses the existing `friendships` table — no migration needed. Renames "friends" semantics to "colleagues" in UI only.

**`src/lib/colleagues.ts`** (new)
- `searchColleagues(query)` — search profiles by username/display_name, exclude self & existing.
- `listColleagues()` — accepted friendships, joined with profiles.
- `listIncomingRequests()` / `listOutgoingRequests()`.
- `sendRequest(userId)`, `acceptRequest(id)`, `declineRequest(id)`, `removeColleague(id)`.

**`src/pages/Colleagues.tsx`** (new, replaces Collegues.tsx)
- Top: large title "Colleagues", subtle search field (glass input, no label).
- Section: pending incoming requests as glass cards — avatar + name + accept/decline icons only.
- Section: colleagues grid — large 64px avatars, display name, `@username` muted. No buttons visible; long-press / hover reveals a contextual menu (remove).
- Search results dropdown: avatar rows with a single "+" icon to send request.

Route: `/colleagues` (replace old `/collegues` typo route too, with a redirect).

## 4. Spaces — segmented control

**`src/pages/Spaces.tsx`**
- Replace current tabs with an Apple-style segmented control (glass pill, 2 segments: Discover · Rooms).
- Large title at top, segmented control centered below, content fades between.

**`src/components/spaces/ColabrateFeed.tsx`**
- Strip secondary text. Each post: large avatar (48px), display name (15px semibold), short content (17px), timestamp muted. Action row: only heart + comment icons (no labels, no repost button visible — moved to long-press menu via dropdown trigger on the card).
- Compose: minimal — just avatar + textarea + a single Post button (glass).

**`src/components/spaces/RoomsPanel.tsx`**
- Room list: avatar/icon (40px), room name, small member-count badge. No descriptions in the list. Selecting a room opens detail with description + messages.
- Hide "Create room" behind a single "+" icon in the header; remove inline form.

## 5. Card & component restyling

Apply `.glass` to:
- Ensemble cards (`Ensembles.tsx`, `EnsembleDetail.tsx`)
- Library score tiles
- Practise session cards
- Inbox invite rows
- Profile sections

Remove:
- Solid colored buttons (replace primary with `.glass-button` + label, except one designated primary action per screen which uses `bg-white text-black` Apple-style filled pill).
- Borders thicker than 1px.
- Helper text under inputs (placeholder only).
- Icon clusters: keep at most 2 icons in any toolbar; move others into a `…` dropdown.

## 6. Inbox — moved to header

- Remove Inbox from sidebar (per the new 6-tab spec).
- Add a small bell/inbox icon in the top-right of `AppLayout` header with the live pending badge already wired up.
- Clicking opens `/inbox` (page already exists; restyle cards to glass).

## 7. Micro-interactions

- All tappable elements get `.spring-tap` (active:scale-95).
- Page transitions: existing `animate-fade-in` on route content wrappers.
- Sidebar items: subtle `hover:bg-white/5` only — no scaling, no color shifts.

---

## Technical notes

**Files created**
- `src/lib/colleagues.ts`
- `src/pages/Colleagues.tsx`
- `src/components/ui/segmented.tsx` (small Apple-style segmented control)

**Files edited**
- `src/index.css`, `tailwind.config.ts` — tokens, gradient bg, glass utilities
- `src/components/AppSidebar.tsx` — glass + new tab list
- `src/layouts/AppLayout.tsx` — glass header, inbox bell
- `src/App.tsx` — route `/colleagues`, redirect old typo
- `src/pages/Spaces.tsx` + `src/components/spaces/*` — segmented control, minimal feed/rooms
- `src/pages/Inbox.tsx` — glass cards
- `src/pages/Ensembles.tsx`, `src/pages/EnsembleDetail.tsx`, `src/pages/Library.tsx`, `src/pages/Profile.tsx`, `src/pages/Index.tsx` (Practise) — glass surfaces, minimal chrome, single primary action

**No DB migration required** — Colleagues uses existing `friendships` table.

**Out of scope** — score reader internals, auth screens (kept as-is unless they clash visually).
