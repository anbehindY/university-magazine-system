# Roadmap: University Magazine Contribution System

## Milestones

- [x] **v1.0 MVP** -- Phases 1-9 + 21 quick tasks (shipped 2026-03-05)
- [ ] **v1.1 Security, Audit & Guest Self-Registration** -- Phases 10-14

## Phases

<details>
<summary>v1.0 MVP (Phases 1-9) -- SHIPPED 2026-03-05</summary>

- [x] Phase 1: Schema and Infrastructure (4/4 plans) -- completed 2026-02-25
- [x] Phase 2: Closure Enforcement (3/3 plans) -- completed 2026-02-26
- [x] Phase 3: Coordinator and Comment API (3/3 plans) -- completed 2026-02-26
- [x] Phase 4: Manager and Reports API (3/3 plans) -- completed 2026-02-26
- [x] Phase 5: UI Layer (5/5 plans) -- completed 2026-03-02
- [x] Phase 6: Critical Fixes (5/5 plans) -- completed 2026-03-03
- [x] Phase 7: Student Comment Thread (2/2 plans) -- completed 2026-03-03
- [x] Phase 8: Upload Rules Enforcement (2/2 plans) -- completed 2026-03-03
- [x] Phase 9: Pagination (4/4 plans) -- completed 2026-03-03

</details>

### v1.1 Security, Audit & Guest Self-Registration

- [ ] **Phase 10: Schema Migration** -- AuditLog model + User fields (mustChangePassword, lastLoginAt) in a single migration
- [ ] **Phase 11: Security Hardening** -- First-login password change gate + login tracking with welcome message
- [ ] **Phase 12: Audit Logging** -- Fire-and-forget audit writes on selection changes + admin audit viewer
- [ ] **Phase 13: Guest Registration & Guest List** -- Public guest self-registration + coordinator notification + faculty-scoped guest list
- [ ] **Phase 14: Admin Analytics Dashboard** -- Session-based active users + browser usage charts with Recharts

## Phase Details

### Phase 10: Schema Migration
**Goal**: Data model is ready for all v1.1 features -- new models and fields exist, migration is applied, and existing data is unaffected
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: SEC-02, AUDIT-02, AUDIT-03
**Success Criteria** (what must be TRUE):
  1. AuditLog model exists with actor, timestamp, submission reference, old value, and new value fields -- and has no update or delete operations exposed
  2. User model has `mustChangePassword` field (default false) so existing users are unaffected
  3. User model has `lastLoginAt` nullable DateTime field
  4. Admin create-user API sets `mustChangePassword: true` on newly created users; self-registered users (future Phase 13) will not have this flag set
**Plans**: TBD

### Phase 11: Security Hardening
**Goal**: Users with temporary passwords are forced to change them before accessing any feature, and all users see when they last logged in
**Depends on**: Phase 10 (requires mustChangePassword and lastLoginAt fields)
**Requirements**: SEC-01, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. A user with `mustChangePassword=true` is redirected to a password change page and cannot access any other page or API endpoint until they change their password
  2. The password change gate is enforced in portal layout, guest layout, and the API route helper (three enforcement points, no bypass via direct URL)
  3. After successful login, the user sees a welcome message showing their last login timestamp (or "first login" if none)
  4. Last login timestamp is recorded only on successful session creation -- banned or blocked attempts do not update it
**Plans**: TBD

### Phase 12: Audit Logging
**Goal**: Coordinator selection changes are permanently recorded and administrators can review the audit trail
**Depends on**: Phase 10 (requires AuditLog model)
**Requirements**: AUDIT-01, AUDIT-04
**Success Criteria** (what must be TRUE):
  1. When a coordinator selects or deselects a submission, an audit entry is written with the actor, timestamp, submission, old value, and new value
  2. Audit writes are fire-and-forget (do not block or slow down the coordinator's selection toggle response)
  3. Admin can view the audit log page with paginated entries and date filtering
**Plans**: TBD

### Phase 13: Guest Registration & Guest List
**Goal**: External users can self-register as guests for a faculty, coordinators are notified and can see who registered
**Depends on**: Phase 11 (guest registration must correctly NOT set mustChangePassword; password change infrastructure must exist)
**Requirements**: GUEST-01, GUEST-02, GUEST-03, GUEST-04, GUEST-05, GUEST-06
**Success Criteria** (what must be TRUE):
  1. An external user can register as a guest by providing name, email, password, and selecting a faculty -- and the account is immediately active (no approval gate)
  2. The registration endpoint hardcodes the GUEST role server-side and never reads role from the request body (no privilege escalation)
  3. When a guest registers, the faculty coordinator(s) receive an email notification
  4. A coordinator can view a read-only list of guest users for their faculty, showing name, email, and registration date
**Plans**: TBD

### Phase 14: Admin Analytics Dashboard
**Goal**: Administrators can see platform usage patterns through charts showing active users and browser breakdown
**Depends on**: Phase 10 (uses session data; no model dependency but logically last)
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04
**Success Criteria** (what must be TRUE):
  1. Admin can view active user counts for the last 7 days and 30 days
  2. Admin can view a browser usage breakdown chart parsed from session user-agent data
  3. Analytics data is displayed using Recharts charts (not just tables or numbers)
  4. All analytics are derived from existing session data -- no separate page view tracking infrastructure is required
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema and Infrastructure | v1.0 | 4/4 | Complete | 2026-02-25 |
| 2. Closure Enforcement | v1.0 | 3/3 | Complete | 2026-02-26 |
| 3. Coordinator and Comment API | v1.0 | 3/3 | Complete | 2026-02-26 |
| 4. Manager and Reports API | v1.0 | 3/3 | Complete | 2026-02-26 |
| 5. UI Layer | v1.0 | 5/5 | Complete | 2026-03-02 |
| 6. Critical Fixes | v1.0 | 5/5 | Complete | 2026-03-03 |
| 7. Student Comment Thread | v1.0 | 2/2 | Complete | 2026-03-03 |
| 8. Upload Rules Enforcement | v1.0 | 2/2 | Complete | 2026-03-03 |
| 9. Pagination | v1.0 | 4/4 | Complete | 2026-03-03 |
| 10. Schema Migration | v1.1 | 0/? | Not started | - |
| 11. Security Hardening | v1.1 | 0/? | Not started | - |
| 12. Audit Logging | v1.1 | 0/? | Not started | - |
| 13. Guest Registration & Guest List | v1.1 | 0/? | Not started | - |
| 14. Admin Analytics Dashboard | v1.1 | 0/? | Not started | - |
