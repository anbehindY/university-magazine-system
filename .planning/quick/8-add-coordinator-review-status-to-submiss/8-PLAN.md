---
phase: quick-8
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - app/api/coordinator/submissions/route.ts
  - app/api/coordinator/submissions/[id]/route.ts
  - app/api/comments/route.ts
  - app/(portal)/coordinator/submissions/page.tsx
autonomous: true
requirements: [QUICK-8]
must_haves:
  truths:
    - "New submissions default to PENDING review status"
    - "Opening a PENDING submission in the slide-over transitions it to REVIEWING"
    - "Coordinator posting a comment transitions the submission to COMMENTED"
    - "Review status badge is visible in the submissions table"
    - "Status transitions are one-directional (never backwards)"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "ReviewStatus enum and reviewStatus field on Submission"
      contains: "enum ReviewStatus"
    - path: "app/api/coordinator/submissions/route.ts"
      provides: "reviewStatus in GET response"
      contains: "reviewStatus"
    - path: "app/api/coordinator/submissions/[id]/route.ts"
      provides: "reviewStatus forward-transition logic in PATCH"
      contains: "reviewStatus"
    - path: "app/api/comments/route.ts"
      provides: "Auto-transition to COMMENTED on coordinator comment"
      contains: "reviewStatus.*COMMENTED"
    - path: "app/(portal)/coordinator/submissions/page.tsx"
      provides: "Review status badge column and PENDING->REVIEWING on panel open"
      contains: "reviewStatus"
  key_links:
    - from: "app/(portal)/coordinator/submissions/page.tsx"
      to: "app/api/coordinator/submissions/[id]/route.ts"
      via: "PATCH request when panel opens to transition PENDING->REVIEWING"
      pattern: "reviewStatus.*REVIEWING"
    - from: "app/api/comments/route.ts"
      to: "prisma.submission.update"
      via: "Auto-update reviewStatus to COMMENTED after coordinator comment creation"
      pattern: "reviewStatus.*COMMENTED"
---

<objective>
Add a coordinator review status lifecycle (PENDING -> REVIEWING -> COMMENTED) to submissions so coordinators can track their progress reviewing student work.

Purpose: Coordinators need visibility into which submissions they have looked at and which still need attention. The status auto-transitions based on coordinator actions (opening the panel, posting a comment).
Output: New ReviewStatus enum in schema, updated APIs, review status badge in coordinator submissions table.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@prisma/schema.prisma
@app/api/coordinator/submissions/route.ts
@app/api/coordinator/submissions/[id]/route.ts
@app/api/comments/route.ts
@app/(portal)/coordinator/submissions/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ReviewStatus enum and field to Prisma schema, run migration</name>
  <files>prisma/schema.prisma</files>
  <action>
1. Add the `ReviewStatus` enum after the existing `SubmissionStatus` enum (after line 27):
   ```prisma
   enum ReviewStatus {
     PENDING
     REVIEWING
     COMMENTED
   }
   ```

2. Add the `reviewStatus` field to the `Submission` model (after the `status` field on line 155):
   ```prisma
   reviewStatus   ReviewStatus     @default(PENDING) @map("review_status")
   ```

3. Run migration:
   ```bash
   npx prisma migrate dev --name add_review_status
   ```

4. Run generate:
   ```bash
   npx prisma generate
   ```
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx prisma validate 2>&1 && echo "---" && grep -A3 "enum ReviewStatus" prisma/schema.prisma && echo "---" && grep "reviewStatus" prisma/schema.prisma</automated>
  </verify>
  <done>ReviewStatus enum exists with PENDING/REVIEWING/COMMENTED values. Submission model has reviewStatus field defaulting to PENDING. Migration applied successfully.</done>
</task>

<task type="auto">
  <name>Task 2: Update coordinator submissions API (GET + PATCH) and comments API</name>
  <files>app/api/coordinator/submissions/route.ts, app/api/coordinator/submissions/[id]/route.ts, app/api/comments/route.ts</files>
  <action>
**`app/api/coordinator/submissions/route.ts` (GET):**

1. Add `reviewStatus: true` to the Prisma `select` object (around line 67, after `isSelected: true`).

2. Add `reviewStatus: s.reviewStatus` to the result mapping (around line 88, after `isSelected: s.isSelected`).

**`app/api/coordinator/submissions/[id]/route.ts` (PATCH):**

1. Update the submission lookup select (line 52) to also fetch `reviewStatus`:
   ```typescript
   select: { facultyId: true, isSelected: true, reviewStatus: true },
   ```

2. Update the body type (line 71-74) to include `reviewStatus`:
   ```typescript
   const body = (await req.json()) as {
     isSelected?: boolean;
     notes?: string | null;
     reviewStatus?: string;
   };
   ```

3. Update the `updateData` type (line 76) to include `reviewStatus`:
   ```typescript
   const updateData: { isSelected?: boolean; notes?: string | null; reviewStatus?: "PENDING" | "REVIEWING" | "COMMENTED" } = {};
   ```

4. After the `notes` handling block (after line 84), add forward-transition validation for `reviewStatus`:
   ```typescript
   if (body.reviewStatus) {
     const order = { PENDING: 0, REVIEWING: 1, COMMENTED: 2 } as const;
     const currentStatus = submission.reviewStatus as keyof typeof order;
     const requestedStatus = body.reviewStatus as keyof typeof order;
     if (
       requestedStatus in order &&
       order[requestedStatus] > order[currentStatus]
     ) {
       updateData.reviewStatus = requestedStatus;
     }
     // Silently ignore invalid or backward transitions
   }
   ```

5. Add `reviewStatus: true` to the `select` in the update call (line 96-103), alongside existing fields.

6. Add `reviewStatus: updated.reviewStatus` to the response object (line 120-124).

**`app/api/comments/route.ts` (POST):**

1. After the `submissionComment.create` call and its `include` block (after line 121, before the `return NextResponse.json` on line 123), add the auto-transition to COMMENTED when a coordinator posts a comment:
   ```typescript
   // Auto-transition reviewStatus to COMMENTED when coordinator comments
   if (role === "MARKETING_COORDINATOR") {
     await prisma.submission.update({
       where: { id: submissionId },
       data: { reviewStatus: "COMMENTED" },
     });
   }
   ```
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>GET API returns reviewStatus for each submission. PATCH API accepts reviewStatus with forward-only transition validation (PENDING->REVIEWING->COMMENTED, never backwards). Comments API auto-sets reviewStatus to COMMENTED when a coordinator posts a comment.</done>
</task>

<task type="auto">
  <name>Task 3: Add review status badge column and auto-transition on panel open to coordinator UI</name>
  <files>app/(portal)/coordinator/submissions/page.tsx</files>
  <action>
1. Add `reviewStatus: string` to the `SubmissionRow` type (line 50-61, after `commentCount: number`).

2. Add a new table header column for "Review" between "Comments" and "Selected" columns. In both the main table header (line 506-522) and the loading skeleton table header (line 456-463):
   ```tsx
   <th className="px-4 py-3 text-sm font-medium text-center">Review</th>
   ```

3. Add a skeleton cell for the new column in the loading skeleton rows (around line 472, before the Selected skeleton cell):
   ```tsx
   <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-16 rounded-sm mx-auto" /></td>
   ```

4. Add the review status badge cell in the table body (between the Comments cell and Selected cell, around line 551). Use color-coded badges:
   ```tsx
   <td className="px-4 py-3 text-center">
     {submission.reviewStatus === "COMMENTED" ? (
       <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Commented</Badge>
     ) : submission.reviewStatus === "REVIEWING" ? (
       <Badge className="bg-blue-100 text-blue-800 border-blue-200">Reviewing</Badge>
     ) : (
       <Badge className="bg-slate-100 text-slate-600 border-slate-200">Pending</Badge>
     )}
   </td>
   ```

5. Create a `handleOpenPanel` function that replaces the direct `setSelectedSubmissionId` call. Place it after the `handlePageSizeChange` function (around line 356):
   ```typescript
   function handleOpenPanel(submission: SubmissionRow) {
     setSelectedSubmissionId(submission.id);
     if (submission.reviewStatus === "PENDING") {
       fetch(`/api/coordinator/submissions/${submission.id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ reviewStatus: "REVIEWING" }),
       })
         .then((res) => {
           if (res.ok) {
             setSubmissions((prev) =>
               prev.map((s) =>
                 s.id === submission.id
                   ? { ...s, reviewStatus: "REVIEWING" }
                   : s
               )
             );
           }
         })
         .catch(console.error);
     }
   }
   ```

6. Update the table row `onClick` (line 529) from:
   ```tsx
   onClick={() => setSelectedSubmissionId(submission.id)}
   ```
   To:
   ```tsx
   onClick={() => handleOpenPanel(submission)}
   ```

7. After a successful comment post in `handlePostComment` (after `await mutateComments()` on line 328, before the catch block), add optimistic update of reviewStatus to COMMENTED:
   ```typescript
   // Optimistically update reviewStatus to COMMENTED
   if (selectedSubmissionId) {
     setSubmissions((prev) =>
       prev.map((s) =>
         s.id === selectedSubmissionId
           ? { ...s, reviewStatus: "COMMENTED", commentCount: s.commentCount + 1 }
           : s
       )
     );
   }
   ```
   Note: The `commentCount + 1` is an optimistic increment to keep the displayed count consistent without waiting for a full refetch.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Visit coordinator submissions page. Verify: (1) Review column with color-coded badges (gray Pending, blue Reviewing, green Commented). (2) Click a Pending submission — badge changes to Reviewing. (3) Post a comment — badge changes to Commented. (4) Closing and reopening a Reviewing submission does NOT revert to Pending.</manual>
  </verify>
  <done>Review status badge column visible in coordinator submissions table with PENDING (gray), REVIEWING (blue), COMMENTED (green) badges. Opening a PENDING submission auto-transitions to REVIEWING. Posting a comment optimistically updates to COMMENTED. Loading skeleton includes the new column.</done>
</task>

</tasks>

<verification>
- `npx prisma validate` passes
- `npx tsc --noEmit` passes with no type errors
- ReviewStatus enum exists in schema with PENDING, REVIEWING, COMMENTED
- Submission model has reviewStatus field defaulting to PENDING
- GET coordinator submissions returns reviewStatus field
- PATCH coordinator submissions accepts reviewStatus with forward-only transitions
- Comments POST auto-sets reviewStatus to COMMENTED for coordinator comments
- UI shows review status badge column with correct color coding
- Panel open triggers PENDING -> REVIEWING transition
- Comment post triggers optimistic COMMENTED update
</verification>

<success_criteria>
1. New submissions default to PENDING review status in the database
2. Opening a PENDING submission in the coordinator panel transitions it to REVIEWING (blue badge)
3. Coordinator posting a comment transitions the submission to COMMENTED (green badge)
4. Transitions are one-directional -- a COMMENTED submission cannot revert to REVIEWING or PENDING
5. Review status badge column is visible in the coordinator submissions table with appropriate color coding
</success_criteria>

<output>
After completion, create `.planning/quick/8-add-coordinator-review-status-to-submiss/8-SUMMARY.md`
</output>
