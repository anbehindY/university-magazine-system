# Phase 10: Schema Migration - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Single Prisma migration adding AuditLog model and User fields (mustChangePassword, lastLoginAt) to support all v1.1 features. Admin create-user API updated to set mustChangePassword flag. Existing data must be unaffected.

</domain>

<decisions>
## Implementation Decisions

### AuditLog model design
- Action field is `String` (not enum) for extensibility — initial value "SELECTION_CHANGE"
- `entityType` String field ("SUBMISSION") for future audit scope expansion
- `entityId` references the submission ID
- `actorId` references the coordinator user ID with a relation
- `oldValue` and `newValue` as nullable Strings ("true"/"false")
- `metadata` as `Json?` for denormalized display data (submission title, faculty name, student name) — avoids joins in admin viewer
- `createdAt` DateTime with `@default(now())`
- No `updatedAt` — audit entries are immutable
- No update or delete operations exposed anywhere
- Table mapped to `audit_log` (snake_case convention matching existing schema)

### User model additions
- `mustChangePassword Boolean @default(false)` — existing users unaffected
- `lastLoginAt DateTime?` — nullable, null means never logged in (or first login since v1.1)
- Both fields added to existing User model, no separate table

### Admin create-user API change
- Add `mustChangePassword: true` to the `prisma.user.update()` data block (line 108)
- Self-registered guests (Phase 13) will NOT set this flag

### Seed data
- Add sample users with `mustChangePassword: true` for dev testing
- Add sample AuditLog entries for admin viewer testing
- Keep existing seed data patterns intact

### Claude's Discretion
- Exact index choices for AuditLog (createdAt, actorId, entityId)
- Column mapping names (snake_case per convention)
- Migration naming
- Whether to add User relation for AuditLog (auditLogs User[]) or keep it one-directional

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User delegated all schema design decisions to Claude.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `prisma/schema.prisma`: Current schema with User, Session, Submission models — all use snake_case `@@map` convention
- `prisma/seed.ts` (assumed): Existing seed script with faculty, user, and submission data

### Established Patterns
- All models use `@@map("snake_case")` table names
- Fields use `@map("snake_case")` column names
- UUID IDs via `@default(uuid())` for most models; User uses string ID from Better Auth
- Relations with `onDelete: Cascade` where appropriate
- `@updatedAt` on mutable models; omit on immutable models

### Integration Points
- `app/api/admin/create-user/route.ts` line 106-116: `prisma.user.update()` call where `mustChangePassword: true` must be added
- `prisma/schema.prisma` User model: add two new fields
- New AuditLog model added to schema
- `lib/auth.ts`: Session creation hook where `lastLoginAt` will be set (Phase 11, but schema must support it)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-schema-migration*
*Context gathered: 2026-03-09*
