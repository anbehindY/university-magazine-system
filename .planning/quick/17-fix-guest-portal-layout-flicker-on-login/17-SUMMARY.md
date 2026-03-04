---
phase: quick-17
plan: 01
subsystem: ui
tags: [nextjs, tailwind, shadcn, guest-experience, portal-layout, server-redirect, mini-dashboard]

# Dependency graph
requires:
  - phase: quick-10
    provides: Standalone guest route group and magazine page at /guest
provides:
  - Server-side GUEST redirect in portal layout before sidebar renders
  - Faculty summary mini-dashboard on guest page (published articles, faculty, academic year)
affects: [guest-experience, portal-layout, portal-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-side-redirect-guard, inline-stat-cards]

key-files:
  created: []
  modified:
    - app/(portal)/layout.tsx
    - app/(portal)/page.tsx
    - app/(guest)/guest/page.tsx

key-decisions:
  - "Server-side redirect()/guest in portal layout fires before any HTML is sent, eliminating sidebar flash for guests"
  - "Removed dead GUEST data-fetching block from portal page.tsx — early return at GUEST check already made it unreachable"
  - "Stat cards built inline in guest page using Card primitives — StatCard is not exported from portal page.tsx and lives in a use client file"

# Metrics
duration: 1min
completed: 2026-03-05
---

# Quick-17: Fix Guest Portal Layout Flicker on Login Summary

**Server-side GUEST redirect in portal layout eliminates sidebar flash; faculty mini-dashboard adds 3 stat cards above the guest article grid**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-04T18:21:52Z
- **Completed:** 2026-03-04T18:22:60Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added `redirect("/guest")` to `app/(portal)/layout.tsx` immediately after `getCurrentUser()`, before any JSX renders — guests no longer see the portal sidebar at any point
- Removed the now-redundant client-side `useEffect` that called `router.replace("/guest")` from `app/(portal)/page.tsx`
- Removed the dead `if (r === "GUEST")` data-fetching block from `app/(portal)/page.tsx` (was unreachable due to the early return already present)
- Added 3 inline stat cards to `app/(guest)/guest/page.tsx` between the hero and the article grid: Published Articles (emerald), Faculty (slate), Academic Year (slate)
- Stat cards only render in the loaded, non-error state — not during loading skeleton

## Task Commits

Each task was committed atomically:

1. **Task 1: Server-side GUEST redirect in portal layout** - `dd679a9` (feat)
2. **Task 2: Add faculty summary mini-dashboard to guest page** - `692b67e` (feat)

## Files Created/Modified

- `app/(portal)/layout.tsx` - Added `redirect` import + `if (user?.role === "GUEST") redirect("/guest")` guard
- `app/(portal)/page.tsx` - Removed client-side GUEST redirect useEffect; removed dead GUEST data-fetch block
- `app/(guest)/guest/page.tsx` - Added 3-column stat card section between hero and articles grid; changed grid div from `py-8` to `pb-8`

## Decisions Made

- Server-side redirect in layout is the correct fix — it fires before any HTML is sent to the client, so the sidebar JSX never executes for guest users
- Dead GUEST data-fetch block removed cleanly since the early return above it (`if (r === "GUEST") { setLoading(false); return; }`) already prevented it from running
- Stat cards built inline using Card primitives from shadcn rather than importing the portal's StatCard (not exported, lives in a "use client" page)

## Deviations from Plan

None - plan executed exactly as written.

## Out-of-Scope Items Deferred

- Pre-existing Tailwind diagnostic on line 179 of `app/(guest)/guest/page.tsx`: `bg-gradient-to-br` can be written as `bg-linear-to-br` (suggestCanonicalClasses warning). Not caused by this task's changes; deferred.

## Self-Check: PASSED

Files verified present:
- `app/(portal)/layout.tsx` - FOUND, contains `redirect("/guest")`
- `app/(portal)/page.tsx` - FOUND, client-side GUEST useEffect removed
- `app/(guest)/guest/page.tsx` - FOUND, contains "Published Articles" stat card

Commits verified:
- `dd679a9` - FOUND in git history
- `692b67e` - FOUND in git history

TypeScript: `npx tsc --noEmit` passes with zero errors.

---
*Phase: quick-17*
*Completed: 2026-03-05*
