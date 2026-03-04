---
phase: quick-14
plan: 14
type: execute
wave: 1
depends_on: []
files_modified: [prisma/seed.ts]
autonomous: true
requirements: [SEED-REALISTIC]

must_haves:
  truths:
    - "Seed creates only 2 academic years: 2024-2025 (past, closed) and 2025-2026 (current, no submissions)"
    - "2024-2025 closure dates are in the past and submission dates fall within the academic year window"
    - "2025-2026 has no seeded submissions — students start with a clean slate"
    - "No 2023-2024 academic year exists after seeding"
  artifacts:
    - path: "prisma/seed.ts"
      provides: "Realistic seed data with proper date alignment"
      contains: "2024-2025"
  key_links:
    - from: "prisma/seed.ts"
      to: "prisma/schema.prisma"
      via: "AcademicYear, Submission models"
      pattern: "prisma\\.academicYear\\.(create|upsert)"
---

<objective>
Update seed data so closure dates and submission dates are realistic per academic year. Remove the 2023-2024 year entirely, keep only 2024-2025 as the previous/archived year with submissions, and remove all current year (2025-2026) submission seeding so students start fresh.

Purpose: The seed data currently has 3 academic years including unrealistic future-dated submissions for 2025-2026. A clean current year lets demo users experience the submission flow naturally, while one past year provides archived data for reports and history views.
Output: Updated prisma/seed.ts
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/seed.ts
@prisma/schema.prisma
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove 2023-2024 year and current year submissions from seed data</name>
  <files>prisma/seed.ts</files>
  <action>
Modify the seed data in prisma/seed.ts with the following changes:

1. **Remove 2023-2024 academic year** from the `academicYears` array entirely — delete the object with yearLabel "2023-2024". Also delete the entire "Section 7: Past year submissions (2023-2024)" block (lines ~565-622 and the `y2324`, `submissionWindow2324` variables). Remove `y2324` from `yearIds` usage.

2. **Keep 2024-2025 academic year** — this remains the only past year with submissions:
   - `isActive: false` (already correct)
   - `firstClosureDate: new Date("2025-03-15T23:59:59Z")` (already correct — in the past)
   - `finalClosureDate: new Date("2025-04-15T23:59:59Z")` (already correct — in the past)
   - Keep submission window as `{ start: new Date("2025-01-10"), end: new Date("2025-03-14") }` — these dates realistically fall before firstClosureDate, which is correct
   - Keep entire Section 8 block (2024-2025 submissions) as-is — the submission dates, comment dates, and selection logic are already realistic relative to the closure dates

3. **Keep 2025-2026 academic year definition** in the `academicYears` array BUT delete the entire Section 9 block (lines ~683-781) that seeds 2025-2026 submissions. This includes:
   - Remove the `prevCount2` variable
   - Remove the entire `for (const facultyName of FACULTY_NAMES)` loop for 2025-2026
   - Remove the console.log lines about 2025-2026 submissions and pending/overdue exceptions
   - The 2025-2026 year stays in the array with `isActive: false` — admin activates it manually via Closure Dates page

4. **Update summary console output** at the bottom:
   - Change `"Academic Years: 3"` to `"Academic Years: 2"`
   - Remove any mention of pending/overdue exceptions
   - The submission count will now only reflect 2024-2025 data

5. **Update the section comment numbers** — renumber remaining sections sequentially (the section after removing 2023-2024 and 2025-2026 submissions will shift).

6. **Remove the `randomDate` helper** if it is only used for 2025-2026 submissions. Check first — if 2024-2025 section also uses `randomDate`, keep it. (It does use it, so keep it.)

Do NOT modify: faculty seeding, user creation, SAMPLE_FILES, TITLES, comment templates, student generation, or the createSubmission helper function. Only the academic year definitions and submission seeding sections change.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit prisma/seed.ts 2>&1 | tail -5</automated>
    <manual>Review seed.ts: only 2 academic years defined, only 2024-2025 has submission seeding, no 2025-2026 submission block exists</manual>
  </verify>
  <done>
    - Only 2 academic years in seed: 2024-2025 (past) and 2025-2026 (current, empty)
    - 2024-2025 has realistic submission dates within its closure window
    - No 2025-2026 submission seeding code exists
    - No 2023-2024 references remain
    - File compiles without TypeScript errors
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit prisma/seed.ts` passes with no errors
- grep for "2023-2024" returns zero matches in seed.ts
- grep for "prevCount2" returns zero matches in seed.ts
- grep for "2025-2026" appears only in the academicYears array definition, not in any submission seeding block
- The only submission for-loop remaining is for 2024-2025
</verification>

<success_criteria>
- seed.ts compiles cleanly
- Only 2 academic years: 2024-2025 (archived with submissions) and 2025-2026 (clean slate, no submissions)
- All submission dates in 2024-2025 fall between Jan-Mar 2025 (before firstClosureDate of 2025-03-15)
- No 2023-2024 academic year or submission code remains
</success_criteria>

<output>
After completion, create `.planning/quick/14-realistic-seed-data-closure-dates-and-su/14-SUMMARY.md`
</output>
