# Roadmap: University Magazine Contribution System

## Milestones

- **v1.0 MVP** — Phases 1-7 (gap closure in progress)

## Phases

<details>
<summary>✅ v1.0 MVP Core (Phases 1-5) — completed 2026-03-02</summary>

- [x] Phase 1: Schema and Infrastructure (4/4 plans) — completed 2026-02-25
- [x] Phase 2: Closure Enforcement (3/3 plans) — completed 2026-02-26
- [x] Phase 3: Coordinator and Comment API (3/3 plans) — completed 2026-02-26
- [x] Phase 4: Manager and Reports API (3/3 plans) — completed 2026-02-26
- [x] Phase 5: UI Layer (5/5 plans) — completed 2026-03-02

</details>

### Phase 6: Critical Fixes — Closure Gate + Submission Title

**Goal:** Fix ZIP download closure gate (MGR-02) and add submission title field (COORD-02) so managers can only download after final closure and coordinator emails show meaningful submission names
**Depends on:** Phase 4, Phase 5
**Requirements:** MGR-02, COORD-02
**Gap Closure:** Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):

1. A Marketing Manager calling GET /api/manager/submissions/download BEFORE `finalClosureDate` receives a 403 response — the inverted closure gate blocks pre-deadline downloads
2. The manager UI Download ZIP button is disabled before `finalClosureDate` with a Tooltip explaining why
3. A student can enter a title when creating or editing a submission, and the title is persisted to the database
4. When a coordinator receives an email notification for a new submission, the subject line includes the student-provided title (not "Untitled")

### Phase 7: Student Comment Thread

**Goal:** Add comment thread display and reply input to the student submissions page so students can read coordinator comments and post replies (COMM-02, COMM-03)
**Depends on:** Phase 3 (comment API), Phase 6
**Requirements:** COMM-02, COMM-03
**Gap Closure:** Closes gaps from v1.0 milestone audit
**Success Criteria** (what must be TRUE):

1. A student viewing their submission can see all coordinator comments in a chronological thread
2. A student can post a reply to a coordinator comment using a text input — the reply appears in the thread after submission
3. The comment thread updates via SWR polling without full page reload (matching the coordinator page pattern)
4. After `finalClosureDate`, the reply input is hidden or disabled (matching COMM-04 enforcement)

## Progress

| Phase                          | Milestone | Plans Complete | Status   | Completed  |
| ------------------------------ | --------- | -------------- | -------- | ---------- |
| 1. Schema and Infrastructure   | v1.0      | 4/4            | Complete | 2026-02-25 |
| 2. Closure Enforcement         | v1.0      | 3/3            | Complete | 2026-02-26 |
| 3. Coordinator and Comment API | v1.0      | 3/3            | Complete | 2026-02-26 |
| 4. Manager and Reports API     | v1.0      | 3/3            | Complete | 2026-02-26 |
| 5. UI Layer                    | v1.0      | 5/5            | Complete | 2026-03-02 |
| 6. Critical Fixes              | v1.0      | 0/?            | Pending  | —          |
| 7. Student Comment Thread      | v1.0      | 0/?            | Pending  | —          |
