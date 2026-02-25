---
phase: 01-schema-and-infrastructure
plan: 02
subsystem: infra
tags: [nodemailer, smtp, email, singleton, typescript]

# Dependency graph
requires: []
provides:
  - "sendMail() async helper backed by Nodemailer 6.x transporter singleton"
  - ".env.example documenting all required environment variables including SMTP_*"
affects: [phase-03-coordinator-workflows, phase-04-submissions-and-files]

# Tech tracking
tech-stack:
  added: [nodemailer@6.10.1, "@types/nodemailer@7.0.11"]
  patterns: [globalForMailer singleton (mirrors globalForPrisma pattern)]

key-files:
  created: [lib/mailer.ts, .env.example]
  modified: [.gitignore, package.json, pnpm-lock.yaml]

key-decisions:
  - "Nodemailer 6.x pinned (not 7.x) — 7.x is ESM-only, conflicts with Prisma/better-auth CommonJS resolution"
  - "globalForMailer singleton pattern mirrors lib/prisma.ts — transporter created once per process"
  - "sendMail() throws on error; callers use .catch(console.error) for fire-and-forget (not retry logic)"
  - "secure=true only when SMTP_PORT===465 (TLS); defaults to STARTTLS on port 587"
  - ".gitignore negation rule added (!.env.example) to allow committing placeholder env docs"

patterns-established:
  - "globalForX singleton: use global cast + non-production guard — see lib/mailer.ts and lib/prisma.ts"
  - "sendMail fire-and-forget: sendMail({...}).catch(console.error) at call sites, never await before responding"

requirements-completed: [INFRA-04]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 1 Plan 02: Nodemailer Mailer Singleton Summary

**Nodemailer 6.x SMTP transporter singleton in lib/mailer.ts with sendMail() helper and .env.example documenting all required env vars**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-25T17:47:12Z
- **Completed:** 2026-02-25T17:49:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed nodemailer@6.10.1 and @types/nodemailer — pinned to 6.x to avoid ESM-only 7.x breaking Prisma/better-auth
- Created lib/mailer.ts with globalForMailer singleton pattern, configures from SMTP_* env vars, secure=true only on port 465
- Created .env.example documenting all 12 required variables across Database, Better Auth, Vercel Blob, Seed, and SMTP sections

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Nodemailer and Create lib/mailer.ts** - `6a37208` (feat)
2. **Task 2: Create .env.example** - `f6d6b62` (chore)

**Plan metadata:** _(pending final commit)_

## Files Created/Modified

- `lib/mailer.ts` - Nodemailer 6.x singleton transporter, exports sendMail() async helper
- `.env.example` - Documents DATABASE_URL, BETTER_AUTH_*, BLOB_READ_WRITE_TOKEN, DEFAULT_ADMIN_*, SMTP_*
- `.gitignore` - Added `!.env.example` negation to allow committing placeholder env file
- `package.json` - Added nodemailer@6.10.1 dep, @types/nodemailer@7.0.11 devDep
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made

- Nodemailer 6.x pinned to avoid ESM-only conflict in 7.x (Prisma/better-auth use CommonJS)
- globalForMailer singleton pattern mirrors lib/prisma.ts — one transporter per Node process
- sendMail() throws on failure; callers fire-and-forget with .catch(console.error)
- secure flag computed as `Number(SMTP_PORT) === 465` — TLS for 465, STARTTLS for 587

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added .gitignore negation for .env.example**
- **Found during:** Task 2 (Create .env.example)
- **Issue:** .gitignore had `.env*` wildcard that caught `.env.example`, preventing it from being staged
- **Fix:** Added `!.env.example` negation line after the `.env*` rule in .gitignore
- **Files modified:** .gitignore
- **Verification:** `git add .env.example` succeeded after the fix
- **Committed in:** f6d6b62 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary to meet the plan's requirement that .env.example be committed to the repository. No scope creep.

## Issues Encountered

None beyond the gitignore blocking issue documented above.

## User Setup Required

None - no external service configuration required at this stage. SMTP credentials must be provided via environment variables when sending email (Phase 3+).

## Next Phase Readiness

- sendMail() is importable and ready for Phase 3 coordinator notification emails
- lib/mailer.ts exports match the expected signature for all Phase 3 notification call sites
- .env.example documents all variables developers need to run the application

---
*Phase: 01-schema-and-infrastructure*
*Completed: 2026-02-25*
