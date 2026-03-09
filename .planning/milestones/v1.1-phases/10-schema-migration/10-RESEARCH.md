# Phase 10: Schema Migration - Research

**Researched:** 2026-03-09
**Domain:** Prisma schema migration, PostgreSQL, audit log data modeling
**Confidence:** HIGH

## Summary

Phase 10 is a foundational data model change that adds an AuditLog model and two fields to the User model, plus a one-line API change. The project uses Prisma 7.4.0 with PostgreSQL via the `@prisma/adapter-pg` driver adapter pattern. The existing schema follows strict conventions: `@@map("snake_case")` for table names, `@map("snake_case")` for column names, UUID IDs via `@default(uuid())`, and `@updatedAt` only on mutable models.

The migration itself is straightforward -- all new fields have safe defaults (Boolean defaults to false, DateTime is nullable, new table has no FK constraints from existing tables). Existing data will be completely unaffected. The admin create-user API change is a single field addition to an existing `prisma.user.update()` call.

**Primary recommendation:** Add the AuditLog model and User fields in schema.prisma, generate and apply the migration, update seed data, and add `mustChangePassword: true` to the admin create-user API's update call.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- AuditLog model: action as String (not enum), entityType as String ("SUBMISSION"), entityId references submission ID, actorId references coordinator user with relation, oldValue/newValue as nullable Strings, metadata as Json?, createdAt with @default(now()), no updatedAt, no update/delete operations, table mapped to "audit_log"
- User model: mustChangePassword Boolean @default(false), lastLoginAt DateTime? nullable
- Admin create-user API: add mustChangePassword: true to prisma.user.update() data block
- Seed data: add sample users with mustChangePassword: true, add sample AuditLog entries

### Claude's Discretion
- Exact index choices for AuditLog (createdAt, actorId, entityId)
- Column mapping names (snake_case per convention)
- Migration naming
- Whether to add User relation for AuditLog (auditLogs User[]) or keep it one-directional

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-02 | Admin-created users are flagged with mustChangePassword=true; self-registered guests are not | User model field addition + admin create-user API update pattern documented |
| AUDIT-02 | Audit entries are append-only (no edit or delete) | AuditLog model design with no updatedAt, no update/delete operations -- enforced at schema level by convention and API layer |
| AUDIT-03 | Audit entry captures actor, timestamp, submission, old value, and new value | AuditLog model fields: actorId, createdAt, entityId, oldValue, newValue all documented |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma | 7.4.0 | Schema definition, migration generation, client generation | Already installed, project standard |
| @prisma/client | 7.4.0 | Database access (generated client) | Already installed, project standard |
| @prisma/adapter-pg | (installed) | PostgreSQL driver adapter | Project uses this pattern for PrismaClient |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @faker-js/faker | (installed) | Seed data generation | Already used in seed.ts |

### Alternatives Considered
None -- this phase uses only existing project dependencies.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Existing Schema Conventions (MUST follow)
```
- Table names: @@map("snake_case")           e.g., @@map("audit_log")
- Column names: @map("snake_case")            e.g., @map("must_change_password")
- IDs: String @id @default(uuid())            for new models
- Timestamps: createdAt DateTime @default(now()) @map("created_at")
- Mutable models: @updatedAt on updatedAt field
- Immutable models: NO updatedAt field         (AuditLog is immutable)
- Relations: onDelete specified where appropriate
- User IDs: String @id (no default -- set by Better Auth)
```

### Pattern 1: AuditLog Model Design
**What:** Append-only audit log table with denormalized metadata
**When to use:** This phase -- new model creation
**Example:**
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  action     String                          // "SELECTION_CHANGE" etc.
  entityType String   @map("entity_type")    // "SUBMISSION" etc.
  entityId   String   @map("entity_id")      // submission UUID
  actorId    String   @map("actor_id")
  actor      User     @relation(fields: [actorId], references: [id])
  oldValue   String?  @map("old_value")      // "true"/"false" or null
  newValue   String?  @map("new_value")
  metadata   Json?                           // denormalized display data
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([actorId])
  @@index([entityId])
  @@map("audit_log")
}
```

### Pattern 2: User Model Field Addition
**What:** Adding optional/defaulted fields to existing model
**When to use:** Extending User without breaking existing data
**Example:**
```prisma
// Add to existing User model:
mustChangePassword Boolean  @default(false) @map("must_change_password")
lastLoginAt        DateTime? @map("last_login_at")
auditLogs          AuditLog[]  // reverse relation
```

### Pattern 3: Admin Create-User API Update
**What:** Single field addition to existing Prisma update call
**Where:** `app/api/admin/create-user/route.ts` line 108
**Example:**
```typescript
// Current (line 106-116):
const updatedUser = await prisma.user.update({
  where: { id: result.user.id },
  data: {
    role,
    facultyId,
    emailVerified: true,
    mustChangePassword: true,  // <-- ADD THIS LINE
  },
  include: {
    faculty: true,
  },
});
```

### Recommended Index Strategy (Claude's Discretion)
**Recommendation:** Three indexes on AuditLog:
1. `@@index([createdAt])` -- admin viewer will query by date range (AUDIT-04 in Phase 12)
2. `@@index([actorId])` -- filter by who performed the action
3. `@@index([entityId])` -- look up audit trail for a specific submission

**Rationale:** These are the three most likely query patterns for the admin audit viewer. Indexes are cheap on a low-write table.

### Relation Direction (Claude's Discretion)
**Recommendation:** Bidirectional -- add `auditLogs AuditLog[]` to User model.
**Rationale:** The reverse relation costs nothing in the database (no column added), enables `include: { auditLogs: true }` if ever needed, and follows Prisma convention. The relation from AuditLog to User is already required (actorId FK).

### Anti-Patterns to Avoid
- **Using enum for action field:** The user explicitly chose String for extensibility. Do NOT create an Action enum.
- **Adding updatedAt to AuditLog:** Audit entries are immutable. No `@updatedAt`.
- **Forgetting @map on new fields:** Every camelCase field MUST have a snake_case @map annotation to match project convention.
- **Setting mustChangePassword default to true:** MUST be `@default(false)` so existing users are unaffected by migration.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration SQL | Hand-written SQL migration | `npx prisma migrate dev` | Prisma generates correct ALTER TABLE with defaults |
| Client types | Manual TypeScript interfaces | `npx prisma generate` | Generated client includes AuditLog type automatically |
| UUID generation | Custom UUID function | `@default(uuid())` in schema | Prisma handles this at database level |

**Key insight:** Prisma 7.x migrations handle additive schema changes (new table, new nullable/default columns) safely with zero data loss. The migration will be a single SQL file with CREATE TABLE and ALTER TABLE statements.

## Common Pitfalls

### Pitfall 1: Forgetting to regenerate Prisma client after migration
**What goes wrong:** TypeScript sees old types, `AuditLog` model not available in code
**Why it happens:** `prisma migrate dev` should auto-generate, but if using `prisma migrate deploy` it does not
**How to avoid:** Always run `npx prisma generate` after migration, or use `npx prisma migrate dev` which does both
**Warning signs:** TypeScript errors about missing `prisma.auditLog`

### Pitfall 2: Migration name conflicts
**What goes wrong:** Migration folder name collides with existing migration
**Why it happens:** Prisma uses timestamp prefix, unlikely but worth noting
**How to avoid:** Use `npx prisma migrate dev --name add_audit_log_and_user_fields`
**Warning signs:** Prisma CLI error during migrate

### Pitfall 3: Seed script fails after schema change
**What goes wrong:** Seed script references new fields that don't exist yet, or old schema doesn't match
**Why it happens:** Seed script compiled against old generated client
**How to avoid:** Run `npx prisma generate` before running seed, ensure seed script is updated to use new fields
**Warning signs:** Runtime errors in seed about unknown field

### Pitfall 4: Missing @map annotations break snake_case convention
**What goes wrong:** New columns created with camelCase names in PostgreSQL
**Why it happens:** Prisma defaults to field name if @map is omitted
**How to avoid:** Every new field must have @map("snake_case") annotation
**Warning signs:** SQL shows column names like "mustChangePassword" instead of "must_change_password"

### Pitfall 5: Json? field type compatibility
**What goes wrong:** metadata field might not work as expected with PostgreSQL jsonb
**Why it happens:** Prisma maps Json to jsonb in PostgreSQL by default, which is correct
**How to avoid:** Use `Json?` (nullable) -- Prisma handles the PostgreSQL mapping correctly
**Warning signs:** None expected -- this is well-supported

## Code Examples

### Complete AuditLog Model
```prisma
// Source: derived from CONTEXT.md decisions + existing schema conventions
model AuditLog {
  id         String   @id @default(uuid())
  action     String
  entityType String   @map("entity_type")
  entityId   String   @map("entity_id")
  actorId    String   @map("actor_id")
  actor      User     @relation(fields: [actorId], references: [id])
  oldValue   String?  @map("old_value")
  newValue   String?  @map("new_value")
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([actorId])
  @@index([entityId])
  @@map("audit_log")
}
```

### User Model Additions
```prisma
// Add these fields to existing User model (after banExpires):
mustChangePassword Boolean   @default(false) @map("must_change_password")
lastLoginAt        DateTime? @map("last_login_at")

// Add this relation (after submissionComments):
auditLogs          AuditLog[]
```

### Seed Data for AuditLog
```typescript
// Source: project seed.ts patterns
// Add after submissions are created, using coordinator and submission IDs
const sampleAuditEntries = [
  {
    action: "SELECTION_CHANGE",
    entityType: "SUBMISSION",
    entityId: submissionId,       // from created submission
    actorId: coordinatorId,       // from created coordinator
    oldValue: "false",
    newValue: "true",
    metadata: {
      submissionTitle: "Autonomous Drone Navigation Systems",
      facultyName: "Faculty of Engineering",
      studentName: "David Park",
    },
  },
];

for (const entry of sampleAuditEntries) {
  await prisma.auditLog.create({ data: entry });
}
```

### Seed Data for mustChangePassword Users
```typescript
// After creating some users, update a few to have mustChangePassword: true
// This simulates admin-created users for dev testing
await prisma.user.update({
  where: { email: "guest.eng@uog.com" },
  data: { mustChangePassword: true },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma 5.x migrate | Prisma 7.x migrate | 2025 | Same API, improved performance. No migration syntax changes. |
| `@prisma/client` import | `./generated/client` import | Prisma 7.x | Project already uses generated output path |

**Deprecated/outdated:**
- None relevant -- Prisma migration API is stable across 5.x-7.x

## Open Questions

1. **Exact number of seed AuditLog entries**
   - What we know: CONTEXT.md says "add sample AuditLog entries for admin viewer testing"
   - What's unclear: How many entries -- a handful or dozens?
   - Recommendation: Create 5-10 entries across different coordinators and submissions to provide meaningful test data for the Phase 12 admin viewer. Tie them to existing selected submissions.

2. **Which seed users get mustChangePassword: true**
   - What we know: "Add sample users with mustChangePassword: true for dev testing"
   - What's unclear: Which specific users
   - Recommendation: Set 2-3 staff users (e.g., one coordinator, one guest) to have mustChangePassword: true. Keep admin and most users as false so dev testing isn't blocked.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed -- no test framework in project |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-02 | Admin create-user sets mustChangePassword: true | manual | Verify via Prisma Studio or API call | N/A |
| AUDIT-02 | AuditLog has no update/delete operations exposed | manual | Code review -- no prisma.auditLog.update/delete in codebase | N/A |
| AUDIT-03 | AuditLog has actor, timestamp, submission, old/new value fields | manual | `npx prisma migrate status` + schema inspection | N/A |

### Sampling Rate
- **Per task commit:** `npx prisma validate` (schema syntax check) + `npx prisma generate` (client generation succeeds)
- **Per wave merge:** `npx prisma migrate dev --name test` (dry run) or `npx prisma db push` to verify against actual database
- **Phase gate:** Migration applied successfully, seed runs without errors, Prisma Studio shows correct schema

### Wave 0 Gaps
- No test framework exists in the project -- all validation is manual or via Prisma CLI commands
- `npx prisma validate` serves as the schema syntax validator
- `npx prisma generate` serves as the type generation validator

## Sources

### Primary (HIGH confidence)
- `/home/alfie/next-prisma/prisma/schema.prisma` -- current schema conventions, existing models, field patterns
- `/home/alfie/next-prisma/app/api/admin/create-user/route.ts` -- exact update call location (line 106-116)
- `/home/alfie/next-prisma/prisma/seed.ts` -- seed patterns, existing user/submission creation
- `/home/alfie/next-prisma/.planning/milestones/v1.1-phases/10-schema-migration/10-CONTEXT.md` -- locked decisions
- Prisma CLI: confirmed version 7.4.0 installed

### Secondary (MEDIUM confidence)
- Prisma 7.x migration behavior (additive columns with defaults are safe) -- consistent with Prisma 5.x-7.x documentation

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, versions confirmed via CLI
- Architecture: HIGH -- schema conventions extracted directly from existing schema.prisma
- Pitfalls: HIGH -- based on direct code inspection and Prisma migration experience

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable -- Prisma migration API does not change frequently)
