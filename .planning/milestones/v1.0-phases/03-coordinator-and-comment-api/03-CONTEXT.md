# Phase 3: Coordinator and Comment API - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Faculty-scoped coordinator API endpoints: list submitted work, receive email notifications on new submissions, post/read comments, toggle selection flag, and annotate with notes. All enforcement is at the API layer. No UI is built in this phase (Phase 5 handles that).

</domain>

<decisions>
## Implementation Decisions

### Email notification design
- Trigger: fire once on the **first** SUBMITTED transition only — when `submittedAt` is null before the PUT and becomes set
- Deduplication: check `submittedAt` field — if already set, the submission was previously submitted, skip the email
- Content: link + student name + submission title (minimal, enough to act on)
- Link target: coordinator dashboard (`/coordinator/submissions`) — generic, always valid regardless of Phase 5 routing

### Comment thread model
- Structure: flat list with optional `parentId` — replies supported at data level, UI rendering is Phase 5's responsibility
- Authors: coordinators can POST a comment on any submission in their faculty; students can POST a reply on their own submission only; cross-faculty coordinators receive 403
- Mutability: immutable once posted — no edit or delete
- Schema fields: `content`, `authorId`, `submissionId`, `parentId` (nullable), `createdAt` — no additional fields needed for Phase 3

### Selection semantics (isSelected)
- Multiple selections allowed per faculty — `isSelected` is a simple boolean per submission, any number can be true simultaneously
- Toggle: free toggle in both directions (Claude's discretion — most practical for coordinator workflow)
- Lock: both `isSelected` and `notes` PATCH operations blocked after `finalClosureDate` (consistent with CLOS-02 closure model)
- Notes field: free-text string, no format constraints, no length limit imposed at API level

### Coordinator GET response shape
- Filter: SUBMITTED status only — drafts are not visible to coordinators
- Fields per submission: `id`, `title`, `status`, `studentName`, `submittedAt`, `isSelected`, `notes`, `fileCount` (metadata only — no files array)
- Pagination: none — return all matching submissions as a flat array (faculty + year dataset is small)
- Sort: `submittedAt` descending — newest submissions first

### Claude's Discretion
- Email link target implementation detail (coordinator dashboard URL format)
- Toggle direction for `isSelected` (free toggle chosen as most practical)
- Error message wording for 403 responses on cross-faculty access
- How `fileCount` is computed (join vs count aggregation)

</decisions>

<specifics>
## Specific Ideas

- The coordinator notification email should be triggered in the same PUT handler that transitions to SUBMITTED status (not a background job or webhook) — keep it synchronous for Phase 3 simplicity
- The comment GET should be part of either the coordinator submissions endpoint or a sub-resource (`/api/comments?submissionId=...`) — planner decides based on research
- Faculty scoping must be enforced server-side on every request — coordinator's `facultyId` from session or DB lookup, never from request body

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-coordinator-and-comment-api*
*Context gathered: 2026-02-26*
