# Requirements: University Magazine Contribution System

**Defined:** 2026-03-09
**Core Value:** Students can submit and manage contributions, coordinators can review and select work, all within enforced academic year closure windows.

## v1.1 Requirements

Requirements for v1.1 milestone. Each maps to roadmap phases.

### Security & Auth

- [x] **SEC-01**: User must change their password on first login before accessing any other page
- [x] **SEC-02**: Admin-created users are flagged with `mustChangePassword=true`; self-registered guests are not
- [x] **SEC-03**: Password change gate is enforced in portal layout, guest layout, and API route helper
- [x] **SEC-04**: User sees their last login timestamp as a welcome message after signing in
- [x] **SEC-05**: Last login is recorded on successful session creation (not on blocked/banned attempts)

### Audit & Compliance

- [ ] **AUDIT-01**: System records an audit entry when a coordinator selects or deselects a submission
- [x] **AUDIT-02**: Audit entries are append-only (no edit or delete)
- [x] **AUDIT-03**: Audit entry captures actor, timestamp, submission, old value, and new value
- [ ] **AUDIT-04**: Admin can view audit log with pagination and date filtering

### Guest Access

- [ ] **GUEST-01**: External user can self-register as a guest by providing name, email, password, and selecting a faculty
- [ ] **GUEST-02**: Guest registration hardcodes GUEST role server-side (never reads role from request body)
- [ ] **GUEST-03**: Faculty coordinator(s) receive an email notification when a new guest registers for their faculty
- [ ] **GUEST-04**: Guest account is immediately active after registration (no approval gate)
- [ ] **GUEST-05**: Coordinator can view a read-only list of guest users registered for their faculty
- [ ] **GUEST-06**: Guest list shows name, email, and registration date

### Analytics

- [ ] **ANALYTICS-01**: Admin can view active user counts for the last 7 and 30 days
- [ ] **ANALYTICS-02**: Admin can view browser usage breakdown parsed from session user-agent data
- [ ] **ANALYTICS-03**: Analytics dashboard displays data using charts (Recharts)
- [ ] **ANALYTICS-04**: Analytics is derived from existing session data (no separate page view tracking)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Audit Extensions

- **AUDIT-EXT-01**: Full audit trail for all mutation actions (not just selection changes)
- **AUDIT-EXT-02**: Audit log export (CSV/PDF)

### Analytics Extensions

- **ANALYTICS-EXT-01**: Page view tracking with dedicated PageView model
- **ANALYTICS-EXT-02**: Real-time analytics dashboard

### Guest Workflow

- **GUEST-EXT-01**: Guest approval workflow (coordinator accept/reject before activation)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Password complexity policy engine | Zod min-length validation is sufficient |
| Coordinator guest account management | Read-only list; admin handles user management |
| Client-side analytics (Google Analytics, Plausible) | Privacy concerns for university system; server-side tracking preferred |
| Audit log entry deletion or editing | Immutable by design for accountability |
| Real-time analytics dashboard | WebSocket/SSE out of scope per project constraints |
| Guest approval workflow | Auto-approve with admin ban fallback is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 11 | Complete |
| SEC-02 | Phase 10 | Complete |
| SEC-03 | Phase 11 | Complete |
| SEC-04 | Phase 11 | Complete |
| SEC-05 | Phase 11 | Complete |
| AUDIT-01 | Phase 12 | Pending |
| AUDIT-02 | Phase 10 | Complete |
| AUDIT-03 | Phase 10 | Complete |
| AUDIT-04 | Phase 12 | Pending |
| GUEST-01 | Phase 13 | Pending |
| GUEST-02 | Phase 13 | Pending |
| GUEST-03 | Phase 13 | Pending |
| GUEST-04 | Phase 13 | Pending |
| GUEST-05 | Phase 13 | Pending |
| GUEST-06 | Phase 13 | Pending |
| ANALYTICS-01 | Phase 14 | Pending |
| ANALYTICS-02 | Phase 14 | Pending |
| ANALYTICS-03 | Phase 14 | Pending |
| ANALYTICS-04 | Phase 14 | Pending |

**Coverage:**
- v1.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-09 after roadmap creation*
