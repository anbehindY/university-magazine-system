---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(portal)/admin/closure-dates/page.tsx
  - app/(portal)/admin/upload-rules/page.tsx
  - app/(portal)/admin/users/page.tsx
autonomous: true
requirements: [QUICK-2]
must_haves:
  truths:
    - "Every successful admin action shows a toast notification at top-center"
    - "Inline success text is removed from closure-dates and upload-rules pages"
    - "Inline success banner is removed from users create/edit dialogs"
    - "Error inline messages are preserved (not replaced with toasts)"
    - "Button loading/saving states are preserved"
  artifacts:
    - path: "app/(portal)/admin/closure-dates/page.tsx"
      provides: "Toast notifications for saveActive, handleSetup, handleRollover"
      contains: "toast.success"
    - path: "app/(portal)/admin/upload-rules/page.tsx"
      provides: "Toast notification for onSave"
      contains: "toast.success"
    - path: "app/(portal)/admin/users/page.tsx"
      provides: "Toast notifications for create, edit, deactivate, reactivate"
      contains: "toast.success"
  key_links:
    - from: "all three admin pages"
      to: "sonner Toaster in app/layout.tsx"
      via: "import { toast } from 'sonner'"
      pattern: "toast\\.success"
---

<objective>
Add success toast notifications to all 8 admin actions across closure-dates, upload-rules, and users pages. Replace existing inline success text/banners with sonner toasts. Keep inline error messages and button loading states intact.

Purpose: Consistent success feedback across admin UI using the existing sonner Toaster already mounted in root layout.
Output: Three updated admin page files with toast.success calls replacing inline success indicators.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(portal)/admin/closure-dates/page.tsx
@app/(portal)/admin/upload-rules/page.tsx
@app/(portal)/admin/users/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add toast.success to closure-dates and upload-rules pages</name>
  <files>
    app/(portal)/admin/closure-dates/page.tsx
    app/(portal)/admin/upload-rules/page.tsx
  </files>
  <action>
**closure-dates/page.tsx** — Add `import { toast } from "sonner";` at top.

1. `saveActive()` (line ~176-177): After `await loadHistory()` succeeds, replace `setSaveStatus("success")` with `toast.success("Closure dates saved successfully.")`. Set `setSaveStatus("idle")` instead so the button returns to normal. In the render section (line ~333-335), REMOVE the `{saveStatus === "success" && ...}` paragraph. Keep the `{saveStatus === "error" && ...}` paragraph. The `saveStatus` type can be narrowed to `"idle" | "saving" | "error"` (line ~67).

2. `handleSetup()` (line ~205-208): After `await activate(academicYear.id)` succeeds and before the state resets, add `toast.success("Academic year set up and activated.")`. No inline text to remove here.

3. `handleRollover()` (line ~245-247): After `await activate(academicYear.id)` succeeds and before `setIsRolloverOpen(false)`, add `toast.success(\`Rolled over to ${rolloverLabel}.\`)`. No inline text to remove here.

**upload-rules/page.tsx** — Add `import { toast } from "sonner";` at top.

1. `onSave()` (line ~144): Replace `setStatus("success")` with `toast.success("Upload rules saved successfully.")` and `setStatus("idle")`. In the render section (line ~342-344), REMOVE the `{status === "success" && ...}` paragraph. Keep the `{status === "error" && ...}` paragraph. The `status` type can be narrowed to `"idle" | "saving" | "error"` (line ~31).
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Check that closure-dates and upload-rules pages compile and no "success" inline text remains in render output.</manual>
  </verify>
  <done>
    - closure-dates: saveActive shows toast, handleSetup shows toast, handleRollover shows toast
    - closure-dates: inline "Saved successfully." paragraph removed from render
    - upload-rules: onSave shows toast, inline "Saved successfully." paragraph removed from render
    - saveStatus and status types narrowed to exclude "success" variant
    - Error inline messages preserved in both files
  </done>
</task>

<task type="auto">
  <name>Task 2: Add toast.success to users page and clean up inline success state</name>
  <files>
    app/(portal)/admin/users/page.tsx
  </files>
  <action>
Add `import { toast } from "sonner";` at top.

1. `handleCreateUser()` (line ~263): Replace `setFormSuccess(...)` with `toast.success("User created successfully.")`. After `await refreshUsers()`, add `setDialogOpen(false)` to close the dialog on success (matching the edit dialog behavior). REMOVE the `formSuccess` state declaration (line ~105). REMOVE the `setFormSuccess(null)` calls in the function and in the dialog's `onOpenChange`. REMOVE the `{formSuccess && ...}` green banner from the dialog render (lines ~430-434).

2. `handleEditUser()` (line ~303): Replace `setEditSuccess("User updated successfully.")` with `toast.success("User updated successfully.")`. REMOVE the `editSuccess` state declaration (line ~109). REMOVE the `setEditSuccess(null)` calls in the function, in `openEditDialog`, and in the edit dialog's `onOpenChange`. REMOVE the `{editSuccess && ...}` green banner from the edit dialog render (lines ~614-618).

3. `handleDeactivateUser()` (line ~331): After `await refreshUsers()` succeeds, add `toast.success("User deactivated.")`.

4. `handleReactivateUser()` (line ~357): After `await refreshUsers()` succeeds, add `toast.success("User reactivated.")`.

Keep all `formError`, `editError`, and error banner render blocks intact. Keep `formLoading` and `editLoading` states for button disabled/text.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Check that users page compiles, formSuccess and editSuccess state variables are fully removed, and toast.success is called in all four handlers.</manual>
  </verify>
  <done>
    - handleCreateUser shows toast and closes dialog on success
    - handleEditUser shows toast (dialog already closes on success)
    - handleDeactivateUser shows toast after refresh
    - handleReactivateUser shows toast after refresh
    - formSuccess and editSuccess state variables fully removed
    - Inline green success banners removed from both dialogs
    - Error banners and loading states preserved
  </done>
</task>

</tasks>

<verification>
All three admin pages compile without TypeScript errors. Each success path calls `toast.success()` instead of showing inline text. No `formSuccess` or `editSuccess` state remains in users page. No `saveStatus === "success"` branch remains in closure-dates. No `status === "success"` branch remains in upload-rules. Error handling is unchanged.
</verification>

<success_criteria>
- `npx tsc --noEmit` passes with no errors
- `grep -r "toast.success" app/(portal)/admin/` returns matches in all 3 files (8 total calls)
- `grep -r "text-emerald-600.*Saved successfully" app/(portal)/admin/` returns NO matches
- `grep -r "formSuccess\|editSuccess" app/(portal)/admin/users/` returns NO matches
</success_criteria>

<output>
After completion, create `.planning/quick/2-add-success-toasters-to-all-admin-action/2-SUMMARY.md`
</output>
