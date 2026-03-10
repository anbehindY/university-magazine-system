# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Security, Audit & Guest Self-Registration

**Shipped:** 2026-03-10
**Phases:** 5 | **Plans:** 7 | **Tasks:** 19

### What Was Built
- Immutable audit log for coordinator selection changes with admin viewer
- First-login password change gate enforced at 3 points (portal layout, guest layout, API helper)
- Login tracking with welcome card showing last login timestamp
- Guest self-registration with hardcoded GUEST role and coordinator email notification
- Faculty-scoped guest list for coordinators with pagination and search
- Admin analytics dashboard with Recharts (active users AreaChart, browser usage PieChart)

### What Worked
- Single-day delivery of 5 phases (7 plans, 19 tasks) — extremely fast execution
- Fire-and-forget pattern reused consistently (audit writes, email notifications) — non-blocking side effects
- Gap closure workflow (Phase 11 Plan 02) caught a root cause affecting 4 UAT tests with a single fix (additionalFields config)
- Research phase identified 15 pitfalls upfront — only 1 required a gap closure plan
- Reusing existing UI patterns (PaginationControls, sidebar entries) kept UI work minimal

### What Was Inefficient
- Phase 11 marked complete before UAT revealed additionalFields gap — required gap closure plan
- Better Auth's additionalFields config was not obvious from docs — required trial-and-error debugging
- ROADMAP.md Phase 11 checkbox still showed `[ ]` after gap closure (stale state in roadmap)

### Patterns Established
- `input: false` on Better Auth additionalFields to prevent client-side manipulation of security fields
- Named import `{ UAParser }` instead of default for Turbopack ESM compatibility
- Fire-and-forget with `.catch(console.error)` for non-critical async operations
- `inferAdditionalFields<typeof auth>()` for monorepo-style type inference from server auth config

### Key Lessons
1. Always run UAT before marking a phase complete — Phase 11's gap would have been caught earlier
2. Better Auth additionalFields require explicit `input: false` for fields that should not be client-writable
3. First public write endpoint (guest registration) needs extra security scrutiny — hardcode roles server-side
4. Gap closure plans are lightweight and effective — single root cause can fix multiple test failures

### Cost Observations
- Model mix: balanced profile (sonnet-dominant execution, opus for planning)
- Sessions: ~3 sessions across research, planning, execution, and gap closure
- Notable: 5 phases executed in a single day with high confidence from upfront research

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 MVP | 9 | 31 + 21 quick | First milestone; established all patterns |
| v1.1 Security | 5 | 7 | Gap closure workflow validated; faster execution |

### Cumulative Quality

| Milestone | Requirements | Satisfied | UAT Pass Rate |
|-----------|-------------|-----------|---------------|
| v1.0 | 31 | 31 (100%) | 20/20 |
| v1.1 | 19 | 19 (100%) | All passed |

### Top Lessons (Verified Across Milestones)

1. Upfront research with pitfall identification prevents most execution surprises
2. Fire-and-forget for non-critical side effects keeps response times fast
3. UAT should run before marking phases complete, not after
