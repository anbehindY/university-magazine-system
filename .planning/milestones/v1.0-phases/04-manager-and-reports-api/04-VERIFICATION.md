---
phase: 04-manager-and-reports-api
verified: 2026-02-26T08:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 4: Manager and Reports API Verification Report

**Phase Goal:** Marketing Manager can download a ZIP of all selected files after final closure, and all statistical and exception reports return correct role-scoped data
**Verified:** 2026-02-26T08:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Marketing Manager calling GET /api/manager/submissions receives all isSelected=true submissions across all faculties with no editing capability | VERIFIED | `route.ts` exports GET only; `where: { isSelected: true }` with no facultyId filter when unscoped; no POST/PUT/PATCH/DELETE exported |
| 2 | Response includes id, title, studentName, facultyName, submittedAt, fileCount per submission, sorted by faculty asc then submittedAt desc | VERIFIED | Map at lines 50–69 builds exact shape; `.sort()` applies `localeCompare` on facultyName then date diff descending |
| 3 | Non-manager roles (student, coordinator, guest, admin) receive 403 on GET /api/manager/submissions | VERIFIED | Line 16: `if (session.user.role !== "MARKETING_MANAGER")` returns 403 — any role that is not MARKETING_MANAGER is rejected |
| 4 | Optional ?facultyId=X filter narrows results to a single faculty | VERIFIED | Lines 23–29: `facultyIdParam` parsed from searchParams; conditionally spread into `where` clause |
| 5 | Marketing Manager calling GET /api/manager/submissions/download after finalClosureDate receives a streaming ZIP archive structured as Faculty/StudentName/filename | VERIFIED | Lines 32–39: inverted gate `!(await isPastFinalClosure())` returns 403 before closure; archive entries use `` `${facultyName}/${studentName}/${filename}` `` pattern at lines 92, 105, 111 |
| 6 | Empty faculty folders appear in the ZIP even when no submissions were selected for that faculty | VERIFIED | Lines 121–127: `selectedFacultyIds` Set built; loop over `facultyMap` writes `.gitkeep` for missing faculties |
| 7 | GET /api/reports?type=submissions returns submission count, percentage of total, and distinct contributors per faculty | VERIFIED | `$queryRaw` with `COUNT(s.id)` and `COUNT(DISTINCT s.user_id)`; BigInt converted to Number; percentage computed as `Math.round((count/total)*1000)/10` |
| 8 | GET /api/reports?type=exceptions returns SUBMITTED contributions with no coordinator comment; overdue=true narrows to 14+ days | VERIFIED | `findMany` with `comments: { none: { authorRole: "MARKETING_COORDINATOR" } }` and `status: "SUBMITTED"`; `submittedAt: { lt: Date.now() - 14*24*60*60*1000 }` when overdue=true |
| 9 | Coordinator and Guest see their faculty only; Manager and Admin see all faculties | VERIFIED | Lines 34–50: scoping block runs only for MARKETING_COORDINATOR and GUEST; MARKETING_MANAGER and ADMINISTRATOR comment at line 50 confirms they pass through with `scopedFacultyId = null` |
| 10 | Student receives 403 on any report request | VERIFIED | Lines 25–29: `if (session.user.role === "STUDENT")` returns 403 before any other logic |

**Score:** 10/10 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/api/manager/submissions/route.ts` | Manager submissions list endpoint | VERIFIED | 79 lines; exports GET; substantive implementation with auth gate, role gate, prisma query, faculty resolution, sort, response |
| `app/api/manager/submissions/download/route.ts` | Streaming ZIP download endpoint | VERIFIED | 162 lines; exports GET; archiver, IIFE serial streaming, inverted closure gate, Readable.toWeb bridge, Content-Disposition header |
| `app/api/reports/route.ts` | Unified reports endpoint with type routing | VERIFIED | 195 lines; exports GET; statistical ($queryRaw) and exception (findMany with none filter) branches; role-scoped faculty filtering |
| `package.json` | archiver dependency present | VERIFIED | `"archiver": "^7.0.1"` in dependencies; `"@types/archiver": "^7.0.0"` in devDependencies |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/manager/submissions/route.ts` | `auth.api.getSession` | session check with MARKETING_MANAGER role gate | WIRED | Line 8: `auth.api.getSession`; line 16: `session.user.role !== "MARKETING_MANAGER"` → 403 |
| `app/api/manager/submissions/route.ts` | `prisma.submission.findMany` | query with `isSelected: true` filter | WIRED | Lines 26–39: `prisma.submission.findMany({ where: { isSelected: true, ... } })` |
| `app/api/reports/route.ts` | `prisma.$queryRaw` | statistical report aggregation with COUNT(DISTINCT) | WIRED | Lines 97–107: `prisma.$queryRaw<StatsRow[]>` with `COUNT(DISTINCT s.user_id)` using `Prisma.sql` template tag |
| `app/api/reports/route.ts` | `prisma.submission.findMany` | exception report with nested none filter | WIRED | Lines 139–165: `findMany` with `comments: { none: { authorRole: "MARKETING_COORDINATOR" } }` |
| `app/api/reports/route.ts` | `prisma.user.findUnique` | faculty scoping for coordinator/guest roles | WIRED | Lines 38–48: `prisma.user.findUnique` fetches `facultyId`; result stored in `scopedFacultyId` |
| `app/api/manager/submissions/download/route.ts` | `archiver` | streaming ZIP archive creation | WIRED | Line 5: `import archiver from "archiver"`; line 60: `archiver("zip", { zlib: { level: 6 } })` |
| `app/api/manager/submissions/download/route.ts` | `isPastFinalClosure` | inverted closure gate — blocks BEFORE final closure | WIRED | Lines 3, 32: `import { isPastFinalClosure }` → `if (!(await isPastFinalClosure()))` returns 403 |
| `app/api/manager/submissions/download/route.ts` | `Readable.toWeb` | Node stream to Web ReadableStream bridge | WIRED | Line 139: `const webStream = Readable.toWeb(archive) as unknown as ReadableStream` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| MGR-01 | 04-01 | Marketing Manager can view all isSelected submissions across all faculties (read-only) | SATISFIED | GET /api/manager/submissions: MARKETING_MANAGER role gate, `isSelected: true` filter, GET-only export |
| MGR-02 | 04-01, 04-03 | Marketing Manager can download ZIP of selected submission files after finalClosureDate, organised Faculty > Student > files | SATISFIED | GET /api/manager/submissions/download: inverted closure gate, serial blob streaming, `${facultyName}/${studentName}/${filename}` path structure |
| RPT-01 | 04-02 | Report shows number of submissions per faculty for each academic year | SATISFIED | `$queryRaw` with `COUNT(s.id) AS submission_count` grouped by `faculty_id`, filtered by `academic_year_id` |
| RPT-02 | 04-02 | Report shows percentage of total submissions per faculty | SATISFIED | `percentageOfTotal = Math.round((submissionCount / total) * 1000) / 10` computed from aggregated counts |
| RPT-03 | 04-02 | Report shows number of distinct student contributors per faculty | SATISFIED | `COUNT(DISTINCT s.user_id) AS distinct_contributors` in same `$queryRaw` |
| RPT-04 | 04-02 | Exception report: all SUBMITTED contributions with no coordinator comment | SATISFIED | `findMany` with `status: "SUBMITTED"`, `comments: { none: { authorRole: "MARKETING_COORDINATOR" } }` |
| RPT-05 | 04-02 | Exception report: SUBMITTED contributions with no comment submitted more than 14 days ago | SATISFIED | `overdue === "true"` adds `submittedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }` |
| RPT-06 | 04-02 | All reports role-scoped: coordinator/guest see faculty only; manager/admin see all | SATISFIED | `scopedFacultyId` pattern: null for manager/admin (all faculties); set to `dbUser.facultyId` for coordinator/guest; applied to both statistical and exception queries |

**All 8 phase requirements satisfied. No orphaned requirements.**

---

## Anti-Patterns Found

No anti-patterns detected in any of the three route files.

Checked patterns:
- No TODO/FIXME/PLACEHOLDER/HACK comments
- No `return null`, `return {}`, `return []` stubs
- No empty handlers (`() => {}`)
- No console.log-only implementations
- No `Promise.all` in download route (serial blob fetching confirmed)
- No hardcoded empty array returns bypassing DB queries

One notable implementation quality item (informational, not a blocker):

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/reports/route.ts` | 102 | Statistical report filters `status = 'SUBMITTED'` in raw SQL — this matches the exception report's filter, creating consistent scoping | INFO | Positive: consistent behavior; statistical reports count only submitted, not draft contributions |

---

## Human Verification Required

### 1. ZIP streaming under real network conditions

**Test:** As a Marketing Manager (after finalClosureDate), call GET /api/manager/submissions/download with several selected submissions that each have multiple files. Download the ZIP and open it.
**Expected:** ZIP opens correctly; folder structure is Faculty/StudentName/filename; all files are intact and readable; faculty folders with no selected submissions appear with a .gitkeep placeholder.
**Why human:** Streaming correctness, ZIP integrity, and folder structure can only be confirmed by opening the actual archive. The IIFE async feeding pattern is logically correct but runtime streaming behavior requires integration testing.

### 2. Role boundary on download endpoint

**Test:** As a STUDENT, MARKETING_COORDINATOR, or GUEST, call GET /api/manager/submissions/download.
**Expected:** 403 response.
**Why human:** Requires live auth session to confirm the role gate fires correctly in the Next.js runtime environment.

### 3. Pre-closure download block

**Test:** With finalClosureDate in the future, call GET /api/manager/submissions/download as MARKETING_MANAGER.
**Expected:** 403 with message "Download unavailable. Final closure date has not passed."
**Why human:** Requires controlling the academic year's finalClosureDate in a live database to test both sides of the gate.

### 4. BigInt serialization safety

**Test:** Call GET /api/reports?type=submissions in an environment with actual submissions. Confirm the JSON response contains numeric values (not null or missing) for submissionCount, distinctContributors, and percentageOfTotal.
**Expected:** Valid numbers in the response; no JSON serialization gaps.
**Why human:** BigInt-to-Number conversion is present in code but actual serialization correctness requires a live Postgres response to confirm no edge cases arise.

---

## Gaps Summary

No gaps. All automated checks passed.

All three route files exist with substantive implementations. All key links are wired. All 8 requirements (MGR-01, MGR-02, RPT-01 through RPT-06) have implementation evidence. TypeScript compiles clean (`npx tsc --noEmit` exits with no output). Git commits referenced in summaries (6e49952, 03770ba, 832a166) all exist and contain the expected file changes.

The four human verification items are integration-level concerns requiring a live database and network — they are not code defects.

---

_Verified: 2026-02-26T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
