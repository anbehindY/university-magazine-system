---
phase: 05-ui-layer
plan: "01"
subsystem: ui
tags: [swr, radix-ui, tabs, sidebar, next.js, prisma, better-auth]

# Dependency graph
requires:
  - phase: 04-manager-and-reports-api
    provides: coordinator/manager/guest API endpoints that sidebar links to
provides:
  - SWR installed and importable for comment polling
  - Tabs UI primitive (Tabs, TabsList, TabsTrigger, TabsContent) from radix-ui
  - Role-based sidebar with no placeholder # links
  - Faculty name display in NavUser for scoped roles (coordinator, guest)
  - GET /api/guest/submissions — faculty-scoped selected submissions
  - Academic years API returns id field for year selector
affects: [05-ui-layer wave-2 plans, guest page, coordinator page, manager page, reports page]

# Tech tracking
tech-stack:
  added: [swr@2.4.0]
  patterns: [radix-ui monorepo import pattern (import from "radix-ui" not "@radix-ui/react-*"), role-switch pattern in buildPages, faculty name fetch via useEffect + /api/faculties]

key-files:
  created:
    - components/ui/tabs.tsx
    - app/api/guest/submissions/route.ts
  modified:
    - components/app-sidebar.tsx
    - components/nav-user.tsx
    - app/api/academic-years/route.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Sidebar uses switch/case in buildPages() — clean mapping, easy to add roles, no implicit fallthrough"
  - "NavUser faculty fetch: useEffect + fetch(/api/faculties), display as 'role · Faculty Name' inline — no spinner while loading"
  - "Tabs uses same radix-ui monorepo import pattern as Switch: import { Tabs as TabsPrimitive } from 'radix-ui'"
  - "Guest submissions API mirrors coordinator pattern exactly: auth gate → role gate → faculty gate → isSelected=true query"

patterns-established:
  - "radix-ui primitive pattern: import from 'radix-ui', forwardRef wrapper, displayName assignment"
  - "Faculty-scoped API guard order: session check → role check → prisma.user.findUnique facultyId → query"

requirements-completed: [GUEST-01]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 5 Plan 01: UI Layer Foundation Summary

**SWR installed, Tabs component added, role-specific sidebar with faculty name display, and guest faculty-scoped submissions API**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T06:33:11Z
- **Completed:** 2026-02-26T06:35:49Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- SWR 2.4.0 installed for comment polling in Wave 2 plans
- Tabs primitive component created with Tabs, TabsList, TabsTrigger, TabsContent exports following radix-ui monorepo pattern
- Sidebar buildPages() rewritten as switch/case — each role gets exact navigation items, no placeholder # URLs remain
- NavUser fetches faculty name client-side via /api/faculties and displays as "role · Faculty Name"
- GET /api/guest/submissions endpoint returns faculty-scoped selected submissions with full guard chain
- Academic years API now includes id field for year selector in reports page

## Task Commits

Each task was committed atomically:

1. **Task 1: Install SWR, create Tabs component, fix academic-years API** - `1a30df8` (feat)
2. **Task 2: Refactor sidebar for role-based navigation with faculty name display** - `03f8673` (feat)
3. **Task 3: Create GET /api/guest/submissions** - `5e5f89c` (feat)

## Files Created/Modified
- `components/ui/tabs.tsx` - Tabs/TabsList/TabsTrigger/TabsContent wrapping radix-ui primitive
- `app/api/guest/submissions/route.ts` - Faculty-scoped selected submissions for GUEST role
- `components/app-sidebar.tsx` - Role-specific nav via switch/case buildPages(), facultyId support, header updated to University Magazine
- `components/nav-user.tsx` - Faculty name fetch via useEffect + /api/faculties, displayed inline
- `app/api/academic-years/route.ts` - Added id: true to select clause
- `package.json` - swr@^2.4.0 added to dependencies
- `pnpm-lock.yaml` - Lock file updated

## Decisions Made
- Sidebar uses switch/case in buildPages() for clarity — easy to add/remove roles, no implicit fallthrough risk
- NavUser displays faculty as "role · Faculty Name" in the same subtitle line — compact fit for sidebar format
- Faculty fetch is fire-and-forget (silently catches errors) — faculty name is cosmetic display only
- Guest API uses same guard order as coordinator: session → role → faculty → query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Foundation complete for all Wave 2 UI pages
- Sidebar shows correct role links for all 5 roles
- SWR available for comment polling
- Tabs available for reports page year selector
- Guest submissions API ready for guest page
- Academic year id available for reports year filter

---
*Phase: 05-ui-layer*
*Completed: 2026-02-26*
