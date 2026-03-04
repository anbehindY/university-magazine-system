---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .env
  - app/api/coordinator/submissions/[id]/route.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "NEXT_PUBLIC_APP_URL is defined in .env with value http://localhost:5000"
    - "When a coordinator selects a submission (isSelected -> true), the student receives an email notification"
    - "No email is sent when a submission is deselected (isSelected -> false)"
    - "The email contains the submission title and a link to the student submissions page"
    - "The email is fire-and-forget — it does not block the API response"
  artifacts:
    - path: ".env"
      provides: "NEXT_PUBLIC_APP_URL environment variable"
      contains: "NEXT_PUBLIC_APP_URL"
    - path: "app/api/coordinator/submissions/[id]/route.ts"
      provides: "Selection email notification to student"
      contains: "sendMail"
  key_links:
    - from: "app/api/coordinator/submissions/[id]/route.ts"
      to: "lib/mailer.ts"
      via: "sendMail import"
      pattern: "import.*sendMail.*from.*@/lib/mailer"
---

<objective>
Add NEXT_PUBLIC_APP_URL to .env and send an email notification to students when their submission is selected by a coordinator.

Purpose: Students should be informed when their contribution is selected for the magazine. The APP_URL env var ensures email links point to the correct domain.
Output: Updated .env with APP_URL section, updated coordinator PATCH route with selection email.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@app/api/coordinator/submissions/[id]/route.ts
@app/api/submissions/route.ts (lines 214-248 — email pattern reference)
@lib/mailer.ts
@.env
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add NEXT_PUBLIC_APP_URL to .env and send selection email to student</name>
  <files>.env, app/api/coordinator/submissions/[id]/route.ts</files>
  <action>
**Part A — .env update:**

Add a new section to `.env` after the Email section:

```
# ──────────────────────────────────────────────────
# App URL (used in email templates)
# ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:5000"
```

**Part B — Selection email in coordinator PATCH route:**

In `app/api/coordinator/submissions/[id]/route.ts`:

1. Add import at top: `import { sendMail } from "@/lib/mailer";`

2. The current `prisma.submission.findUnique` on line 49 only selects `facultyId`. Modify it to also select `isSelected` so we can detect the transition from unselected to selected:
   ```typescript
   const submission = await prisma.submission.findUnique({
     where: { id },
     select: { facultyId: true, isSelected: true },
   });
   ```

3. Capture the previous selection state before the update:
   ```typescript
   const wasSelected = submission.isSelected;
   ```

4. Expand the `prisma.submission.update` select to include `title` and the user's email, so we have what we need for the notification without an extra query:
   ```typescript
   const updated = await prisma.submission.update({
     where: { id },
     data: updateData,
     select: {
       id: true,
       isSelected: true,
       notes: true,
       title: true,
       user: { select: { email: true, name: true } },
     },
   });
   ```

5. After the update, before the return, add fire-and-forget email logic. Only send when transitioning TO selected (wasSelected was false AND updated.isSelected is true):
   ```typescript
   // Send notification email when submission is newly selected
   if (!wasSelected && updated.isSelected) {
     const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000";
     const submissionTitle = updated.title ?? "Untitled";

     sendMail({
       to: updated.user.email,
       subject: `Your submission "${submissionTitle}" has been selected!`,
       html: `<p>Congratulations! Your submission <em>${submissionTitle}</em> has been selected for the university magazine.</p>
              <p><a href="${appUrl}/submissions">View your submissions</a></p>`,
       text: `Congratulations! Your submission "${submissionTitle}" has been selected for the university magazine. Visit ${appUrl}/submissions to view your submissions.`,
     }).catch(console.error);
   }
   ```

6. Adjust the return to strip `title` and `user` from the response to maintain the existing API contract (only return id, isSelected, notes):
   ```typescript
   return NextResponse.json({
     submission: {
       id: updated.id,
       isSelected: updated.isSelected,
       notes: updated.notes,
     },
   });
   ```

Follow the exact fire-and-forget pattern from `app/api/submissions/route.ts` lines 240-246: call `sendMail({...}).catch(console.error)` without `await`.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30 && grep -n "NEXT_PUBLIC_APP_URL" .env && grep -n "sendMail" app/api/coordinator/submissions/[id]/route.ts</automated>
    <manual>Verify .env has the new APP_URL section and the coordinator route imports sendMail, checks wasSelected transition, and sends fire-and-forget email</manual>
  </verify>
  <done>
    - .env contains NEXT_PUBLIC_APP_URL="http://localhost:5000" in a clearly labeled section
    - Coordinator PATCH route sends email to student when isSelected transitions from false to true
    - No email sent when isSelected transitions to false (deselection) or when isSelected was already true
    - Email contains submission title and link to /submissions page
    - Email is fire-and-forget (not awaited), errors logged via .catch(console.error)
    - TypeScript compiles without errors
    - API response shape unchanged (id, isSelected, notes only)
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `.env` contains `NEXT_PUBLIC_APP_URL="http://localhost:5000"`
- `app/api/coordinator/submissions/[id]/route.ts` imports `sendMail` from `@/lib/mailer`
- Email only fires on `!wasSelected && updated.isSelected` transition
- Fire-and-forget pattern: `sendMail({...}).catch(console.error)` (no await)
- API response shape preserved: `{ submission: { id, isSelected, notes } }`
</verification>

<success_criteria>
- NEXT_PUBLIC_APP_URL is set in .env
- When a coordinator selects a submission, the student gets a congratulatory email with a link
- Deselecting does not trigger an email
- Re-selecting (already selected) does not trigger a duplicate email
- The API response is unchanged for existing consumers
</success_criteria>

<output>
After completion, create `.planning/quick/5-update-env-with-app-url-and-send-email-t/5-SUMMARY.md`
</output>
