---
phase: 10
slug: schema-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification (schema migration phase — no app logic tests) |
| **Config file** | prisma/schema.prisma |
| **Quick run command** | `npx prisma validate` |
| **Full suite command** | `npx prisma migrate dev --name v1_1_schema && npx prisma validate` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx prisma validate`
- **After every plan wave:** Run `npx prisma migrate dev` (if not already applied)
- **Before `/gsd:verify-work`:** Full migration applied, `npx prisma validate` green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | AUDIT-02, AUDIT-03 | schema | `npx prisma validate` | N/A | pending |
| 10-01-02 | 01 | 1 | SEC-02 | schema | `npx prisma validate` | N/A | pending |
| 10-01-03 | 01 | 1 | SEC-02 | manual | Verify create-user API sets flag | N/A | pending |
| 10-01-04 | 01 | 1 | — | seed | `npx prisma db seed` | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No test framework needed for schema migration phase — validation is via `prisma validate` and `prisma migrate dev`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AuditLog model is append-only | AUDIT-02 | Schema design choice, not runtime test | Verify no update/delete Prisma operations exist for AuditLog in codebase |
| create-user sets mustChangePassword | SEC-02 | API behavior change | POST to /api/admin/create-user, verify user has mustChangePassword=true |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
