# Phase 9: Pagination - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add server-side pagination to the admin user management table (confirmed in scope) and any other table views that the planner identifies as having unbounded row counts. Pagination should keep the UI performant and usable at scale. Search, filtering, and sorting are NOT in scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Pagination controls style
- Numbered page buttons — show page numbers with ellipsis for large ranges (e.g. 1 2 3 … 12)
- Include Prev / Next navigation alongside numbered buttons

### Page size
- Default page size: 10 rows
- User-selectable: 10 / 25 / 50 options
- The page size selector should be visible near the table controls

### Which tables
- User management table is confirmed in scope
- Planner should analyze all other table views in the app and include pagination for any with unbounded row counts (e.g. submissions list, if applicable)
- Criterion: if the table can realistically grow to 50+ rows in production, paginate it

### URL / state persistence
- Component state only — current page and page size do NOT need to live in the URL
- Page resets to 1 on refresh is acceptable

### Claude's Discretion
- Placement of controls (above vs below table — optimize for best UX per table)
- Number of visible page buttons before ellipsis truncation
- API query parameter naming (page/pageSize or skip/take — match existing patterns)
- Loading state handling (skeleton vs spinner — match existing patterns)

</decisions>

<specifics>
## Specific Ideas

- No specific design references — match the existing admin table aesthetic
- Page size selector and page controls should feel consistent across all paginated tables

</specifics>

<deferred>
## Deferred Ideas

- URL-based pagination state (bookmarkable pages) — noted for future if needed
- Search and filtering on paginated tables — separate phase if required

</deferred>

---

*Phase: 09-pagination*
*Context gathered: 2026-03-03*
