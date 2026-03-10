# Phase 12: Audit Logging - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Coordinator selection changes are permanently recorded as audit entries, and administrators + managers can review the audit trail on a paginated, date-filtered page. Fire-and-forget writes ensure no performance impact on the coordinator workflow.

</domain>

<decisions>
## Implementation Decisions

### Audit entry creation (AUDIT-01)
- Insert audit log entry in the coordinator PATCH handler (`app/api/coordinator/submissions/[id]/route.ts`) after successful `prisma.submission.update()`
- **Fire-and-forget:** `prisma.auditLog.create(...).catch(console.error)` — NO `await`, NO transaction wrapping (per Pitfall 2)
- Only create entry when `isSelected` actually changes value — compare `wasSelected` (line 69) with `updated.isSelected` (per Pitfall 13)
- Derive action from state change: `wasSelected ? "DESELECTED" : "SELECTED"` (not from request body)
- Populate `metadata` JSON with denormalized display data: `{ submissionTitle, facultyName, studentName }` — avoids joins in admin viewer (per Phase 10 CONTEXT)

### Audit log viewer page
- **Access:** Admin (ADMINISTRATOR) and Manager (MARKETING_MANAGER) — both roles can view
- **Route:** `app/(portal)/admin/audit-log/page.tsx`
- **API:** `GET /api/admin/audit-log` with `requireRole(["ADMINISTRATOR", "MARKETING_MANAGER"])`
- **Layout:** Full detail inline table — coordinator name, action badge (Selected/Deselected), submission title, faculty, student, timestamp all visible per row
- **Action display:** Badge — green "Selected" or red "Deselected" derived from newValue
- **No summary stats** — just the table with filters, keep it simple
- **No click-to-expand** — all info visible inline

### Table columns
- Coordinator (actor name from metadata or relation)
- Action (Selected/Deselected badge)
- Submission (title from metadata)
- Faculty (from metadata)
- Student (from metadata)
- Timestamp (absolute format)

### Date filtering
- **Preset range buttons + custom date range** — presets for quick access (Today, Last 7 days, Last 30 days, All time), plus from/to date inputs for specific lookups
- **Inline above the table** — horizontal row of filter controls, not collapsible
- **Default:** Last 30 days on page load
- **Date-only filtering** — no coordinator or faculty filter for v1.1

### Timestamp format
- **Absolute:** "5 Mar 2026, 2:30 PM" — matches welcome card pattern from Phase 11
- Consistent date-fns format string across the app

### Empty state
- Simple empty state — "No audit entries found" with an icon
- Adjusts message if filters are active vs. no entries at all

### Pagination
- Follow existing admin users pattern: `page` + `pageSize` query params, `skip/take` in Prisma, parallel `count()` + `findMany()`
- Default page size: 10 (matching admin users page)

### Admin sidebar
- Add "Audit Log" nav item to ADMINISTRATOR case in `components/app-sidebar.tsx`
- Uses a lucide-react icon (e.g., `ScrollText` or `FileSearch`)

### Claude's Discretion
- Exact badge color classes for Selected/Deselected
- Whether to use Prisma `include` for actor relation or read from metadata JSON
- Date picker component choice (native HTML or shadcn date picker)
- Preset button styling (toggle group, outline buttons, etc.)
- Table responsive behavior on small screens
- Whether manager gets a sidebar link or accesses via URL only

</decisions>

<specifics>
## Specific Ideas

- Human-readable action descriptions: "John Smith selected 'My Article Title'"
- All metadata displayed inline — no drill-down needed for basic audit review
- Preset date filters for common use cases, custom range for investigations

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/coordinator/submissions/[id]/route.ts`: PATCH handler with `wasSelected` tracking (line 69) and fire-and-forget email pattern (lines 120-132)
- `app/api/admin/users/route.ts`: Server-side pagination pattern with `page`, `pageSize`, `skip/take`, parallel count + findMany
- `app/(portal)/admin/users/page.tsx`: Admin table page pattern with loading/error states, pagination controls
- `components/app-sidebar.tsx` line 100-106: ADMINISTRATOR nav items array
- `prisma/schema.prisma` lines 216-232: AuditLog model with all required fields and indexes

### Established Patterns
- Fire-and-forget: `.catch(console.error)` without `await` (email notifications)
- Pagination: `{ items, total, page, pageSize }` API response shape
- Admin pages: client components with `useSession()`, `useEffect` fetch, table + pagination
- Badge component from shadcn/ui for status display
- `date-fns` `format()` for timestamp display

### Integration Points
- `app/api/coordinator/submissions/[id]/route.ts` line ~120: Insert audit log creation after successful update, before email notification
- `components/app-sidebar.tsx` line 100-106: Add audit log nav item to ADMINISTRATOR array
- New API route: `app/api/admin/audit-log/route.ts`
- New page: `app/(portal)/admin/audit-log/page.tsx`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-audit-logging*
*Context gathered: 2026-03-09*
