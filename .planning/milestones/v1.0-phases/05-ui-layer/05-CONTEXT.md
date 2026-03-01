# Phase 5: UI Layer - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

All roles can access their respective views and complete their workflows entirely through the UI — coordinators review and select submissions, managers download ZIPs, guests view selected work, and reports are accessible to all authorized roles. This phase builds the frontend pages consuming the APIs from Phases 1-4.

</domain>

<decisions>
## Implementation Decisions

### Page structure and navigation
- Sidebar nav with role-based items — only show links relevant to the user's role
- Adapt to the existing theme, colors, and button styles already in the project — do not introduce a new design system
- Claude should remove unnecessary items from the sidebar and keep it clean
- Role-specific landing pages: Coordinator → /coordinator/submissions, Manager → /manager/submissions, Guest → /guest/submissions, Admin → /admin/dashboard, Student → /submissions
- Sidebar shows user name + role badge (e.g., "Coordinator"), plus faculty name for scoped roles
- Logout button at the bottom of the sidebar, always visible

### Submission detail and comments
- Slide-over panel: clicking a submission row slides in a panel from the right showing details, comments, and actions. The list stays visible underneath.
- "Selected for Publication" toggle and notes textarea appear in the slide-over panel header, above the comment thread
- Comment thread updates via SWR polling every 15 seconds — new comments appear automatically without page reload
- One textarea at the bottom of the thread — coordinators can always post, students see it only when replying to a coordinator comment (click "Reply" on a comment to set parentId)

### Reports presentation
- Single /reports page with tabs: "Statistics" and "Exceptions"
- Statistical reports: summary cards at top (total submissions, total contributors) + sortable data table below showing per-faculty breakdown with counts, percentages, and contributor numbers
- Exception reports: color-coded rows — amber/yellow for "no coordinator comment", red for 14+ days overdue. Tabs or toggle to switch between "All exceptions" and "Overdue only"
- Academic year selector dropdown at the top of the reports page, defaulting to the active year. Changing it re-fetches data via the ?academicYearId API param

### Guest and manager views
- Guest view uses the same layout as coordinator but read-only — no toggle, no notes, no comment input. Just viewing selected submissions for their faculty.
- Manager submission list has a faculty dropdown filter (matches ?facultyId API param), defaults to "All faculties"
- Manager page shows total selected count and per-faculty count badge next to the filter dropdown
- Download ZIP button with loading/spinner state while streaming. Disabled before finalClosureDate with a tooltip explaining why.

### Claude's Discretion
- Exact component library usage (shadcn, Tailwind patterns — follow what's already in the project)
- Loading skeletons and empty state designs
- Exact spacing, typography, and responsive breakpoints
- Error state handling and toast notifications
- Table column widths and sorting defaults

</decisions>

<specifics>
## Specific Ideas

- Adapt to the existing theme and color assumptions already in the codebase — do not introduce new design tokens
- Slide-over panel for submission detail (like Linear's side panels — contextual without losing list context)
- SWR polling for comment thread updates (15s interval)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ui-layer*
*Context gathered: 2026-02-26*
