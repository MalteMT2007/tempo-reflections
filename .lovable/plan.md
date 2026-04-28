## Goal

Two improvements to the reading experience:

1. **Sticky landing in Library** — when you open a score (the "notes" view), Library remembers it. If you switch tabs in the bottom dock or close/reopen the site, returning to Library reopens that same score automatically.
2. **Cleaner reading view** — while a score is open, hide the floating bottom dock entirely and show a small hamburger button in its place. Tapping the hamburger reveals the same nav items (Library, Ensembles, Colleagues, Rooms). The hamburger only appears in the score/notes view, never on regular pages.

## What changes

### 1. Remember the open score (`src/pages/Library.tsx`)

- Persist `openScore.id` to `localStorage` under `tempo:lib-open-score` whenever a score is opened, and clear it when closed.
- On mount, after `listMyScores()` resolves, look up the saved id; if a matching score exists, set it as `openScore` so the reader opens automatically.
- Edge case: if the saved id no longer exists (deleted on another device), silently clear the key.

### 2. Signal "reader is open" globally (`src/components/ScoreReader.tsx`)

- On mount, add `data-reader-open="true"` to `document.body`; remove on unmount.
- This lets the layout react without prop-drilling.

### 3. Conditional dock vs hamburger (`src/layouts/AppLayout.tsx` + `src/components/BottomDock.tsx`)

- In `AppLayout`, track reader-open state via a small effect that watches the body attribute (MutationObserver, or a tiny custom event dispatched from ScoreReader).
- When reader is open:
  - Hide `<BottomDock />`.
  - Render a new `<ReaderHamburger />` in its place — a single floating circular button (bottom-right, safe-area aware) with a `Menu` icon.
  - Tapping it opens a small popover/sheet listing the same four destinations (Library, Ensembles, Colleagues, Rooms) with their icons. Selecting one navigates and closes the menu (which also closes the reader since route changes).
- When reader is closed: render `<BottomDock />` as today.

### 4. New component: `src/components/ReaderHamburger.tsx`

- Reuses the same items array as `BottomDock`.
- Visual: 44×44 rounded-full button, glass-morphism style matching the dock, positioned bottom-right with `env(safe-area-inset-bottom)`.
- Uses an existing `Popover` (from `components/ui/popover.tsx`) for the menu.

## Technical notes

- No backend or schema changes — purely client state (`localStorage`) and presentation.
- No changes to ScoreReader internals beyond the body-attribute toggle.
- The hamburger lives outside ScoreReader so it stays clickable above the reader's full-screen overlay (z-index above the reader's chrome).

## Files touched

- `src/pages/Library.tsx` — persist + restore last-opened score
- `src/components/ScoreReader.tsx` — set/unset `data-reader-open` on body
- `src/layouts/AppLayout.tsx` — switch between dock and hamburger
- `src/components/ReaderHamburger.tsx` — new file
