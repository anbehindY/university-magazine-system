# Roadmap: University Magazine Contribution System

## Milestones

- **v1.0 MVP** — Phases 1-9 (gap closure in progress)

## Phases

<details>
<summary>✅ v1.0 MVP Core (Phases 1-5) — completed 2026-03-02</summary>

- [x] Phase 1: Schema and Infrastructure (4/4 plans) — completed 2026-02-25
- [x] Phase 2: Closure Enforcement (3/3 plans) — completed 2026-02-26
- [x] Phase 3: Coordinator and Comment API (3/3 plans) — completed 2026-02-26
- [x] Phase 4: Manager and Reports API (3/3 plans) — completed 2026-02-26
- [x] Phase 5: UI Layer (5/5 plans) — completed 2026-03-02

</details>

### Phase 6: Critical Fixes — Closure Gate + Submission Title (COMPLETE 2026-03-03)

**Goal:** Fix ZIP download closure gate (MGR-02) and add submission title field (COORD-02) so managers can only download after final closure and coordinator emails show meaningful submission names
**Depends on:** Phase 4, Phase 5
**Requirements:** MGR-02, COORD-02
**Plans:** 5/5 plans complete
**Gap Closure:** Closes gaps from v1.0 milestone audit + UAT session
**Success Criteria** (what must be TRUE):

1. A Marketing Manager can download ZIP at any time without date restriction
2. A student can enter a required title as the first field in the submission form
3. Title persists via DB draft saves only (no localStorage)
4. Closure date info has an info icon and visual distinction
5. Edit form separates existing files from new file selection cleanly
6. API validates title is present on submission (not drafts)
7. Submission notification email reaches every coordinator in the student's faculty

Plans:
- [x] 06-01-PLAN.md — ZIP download closure gate + manager UI Tooltip
- [x] 06-02-PLAN.md — Submission title field end-to-end wiring
- [x] 06-03-PLAN.md — Remove ZIP closure gate (API + UI) — gap closure
- [x] 06-04-PLAN.md — Student form: title to top, required, no localStorage, closure info icon — gap closure
- [x] 06-05-PLAN.md — Edit form file cleanup, API title validation, email verification — gap closure

### Phase 7: Student Comment Thread

**Goal:** Add comment thread display and reply input to the student submissions page so students can read coordinator comments and post replies (COMM-02, COMM-03)
**Depends on:** Phase 3 (comment API), Phase 6
**Requirements:** COMM-02, COMM-03
**Plans:** 2/2 plans complete
**Gap Closure:** Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):

1. A student viewing their submission can see all coordinator comments in a chronological thread
2. A student can post a reply to a coordinator comment using a text input — the reply appears in the thread after submission
3. The comment thread updates via SWR polling without full page reload (matching the coordinator page pattern)
4. After `finalClosureDate`, the reply input is hidden or disabled (matching COMM-04 enforcement)

Plans:
- [ ] 07-01-PLAN.md — API changes (isLocked + comment count) and card layout rewrite
- [ ] 07-02-PLAN.md — Sheet comment panel with SWR polling, reply interaction, closure state

### Phase 8: Upload Rules Enforcement

**Goal:** Wire admin-configured upload rules (stored in ConfigSetting) to the student upload flow so file type restrictions, size limits, and upload toggles are actually enforced — not just displayed in the admin UI
**Depends on:** Phase 1 (ConfigSetting model), Phase 5 (student upload UI)
**Requirements:** UPLOAD-01, UPLOAD-02, UPLOAD-03
**Plans:** 2/2 plans complete
**Gap Closure:** Closes user-reported gap — admin upload rules exist but are never checked during uploads
**Success Criteria** (what must be TRUE):

1. When `enable_uploads` is set to `false` in ConfigSetting, students cannot upload files — the API returns a 403 and the UI shows uploads are disabled
2. Student uploads are rejected (API 400) if the file type is not in the admin-configured `allowed_file_types` list — the client-side filter also reflects the configured types
3. Student uploads are rejected (API 400) if the file exceeds the admin-configured `max_upload_size_mb` — the client shows the configured limit
4. Student uploads are rejected (API 400) if adding files would exceed `max_files_per_upload` for that submission

Plans:
- [ ] 08-01-PLAN.md — Public upload-rules endpoint + server-side enforcement in upload route
- [ ] 08-02-PLAN.md — Student page SWR config fetch, disabled Alert, dynamic accept attr, hint text, client pre-validation

### Phase 9: Pagination

**Goal:** Add server-side pagination to the user management table and any other table views with potentially large datasets, so the UI remains performant and usable at scale
**Depends on:** Phase 5 (UI layer)
**Requirements:** UX-01, UX-02
**Plans:** 2/4 plans executed
**Gap Closure:** Closes user-reported gap — tables render all rows without pagination
**Success Criteria** (what must be TRUE):

1. The admin user management table paginates with configurable page size — users see page controls and the API accepts `page` and `pageSize` query parameters
2. Any other table view identified during planning as having unbounded row count also uses paginated fetching with page controls

Plans:
- [ ] 09-01-PLAN.md — Shared PaginationControls component + admin users API pagination
- [ ] 09-02-PLAN.md — Coordinator submissions API pagination
- [ ] 09-03-PLAN.md — Admin users page UI: pagination state + PaginationControls rendering
- [ ] 09-04-PLAN.md — Coordinator submissions page UI: pagination state + PaginationControls rendering

## Progress

| Phase                          | Milestone | Plans Complete | Status   | Completed  |
| ------------------------------ | --------- | -------------- | -------- | ---------- |
| 1. Schema and Infrastructure   | v1.0      | 4/4            | Complete | 2026-02-25 |
| 2. Closure Enforcement         | v1.0      | 3/3            | Complete | 2026-02-26 |
| 3. Coordinator and Comment API | v1.0      | 3/3            | Complete | 2026-02-26 |
| 4. Manager and Reports API     | v1.0      | 3/3            | Complete | 2026-02-26 |
| 5. UI Layer                    | v1.0      | 5/5            | Complete | 2026-03-02 |
| 6. Critical Fixes              | v1.0      | 5/5            | Complete | 2026-03-03 |
| 7. Student Comment Thread      | 2/2 | Complete    | 2026-03-03 | —          |
| 8. Upload Rules Enforcement    | 2/2 | Complete   | 2026-03-03 | —          |
| 9. Pagination                  | 2/4 | In Progress|  | —          |
