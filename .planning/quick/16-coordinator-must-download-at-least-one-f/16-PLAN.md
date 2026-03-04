---
phase: quick-16
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/(portal)/coordinator/submissions/page.tsx
autonomous: true
requirements: [QUICK-16]

must_haves:
  truths:
    - "Comment textarea is disabled until coordinator clicks at least one file download link for that submission"
    - "Post Comment button is disabled until coordinator clicks at least one file download link for that submission"
    - "After clicking a file link, comment textarea and button become enabled for that submission"
    - "Download tracking is per-submission and per-session (resets on page reload)"
    - "File links still open in new tab as before (download behavior unchanged)"
  artifacts:
    - path: "app/(portal)/coordinator/submissions/page.tsx"
      provides: "Download-gated comment UX for coordinators"
      contains: "downloadedSubmissions"
  key_links:
    - from: "file <a> onClick handler"
      to: "downloadedSubmissions state Set"
      via: "onClick callback adds submission ID to Set"
      pattern: "downloadedSubmissions"
    - from: "downloadedSubmissions state"
      to: "comment textarea and Post Comment button"
      via: "disabled prop derived from Set membership check"
      pattern: "hasDownloaded"
---

<objective>
Gate the coordinator comment textarea and submit button behind a file download requirement. The coordinator must click at least one file download link for a submission before they can type or post a comment on that submission. This is a client-side session-scoped UX gate only.

Purpose: Ensure coordinators actually review submission files before providing feedback.
Output: Updated coordinator submissions page with download-gated commenting.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(portal)/coordinator/submissions/page.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add download-tracking state and gate comment UI</name>
  <files>app/(portal)/coordinator/submissions/page.tsx</files>
  <action>
  Add a `useRef` holding a `Set<string>` to track which submission IDs have had at least one file downloaded in the current session. Use `useRef` (not `useState`) for the Set itself to avoid re-render overhead, paired with a `useState<number>` counter to trigger re-renders when the Set changes.

  Specific changes:

  1. Add state near other state declarations (around line 153):
     ```
     const downloadedSubmissionsRef = useRef<Set<string>>(new Set());
     const [downloadVersion, setDownloadVersion] = useState(0);
     ```
     Import `useRef` from React (already has `useEffect, useState` imported -- add `useRef` to the existing import).

  2. Add a handler function after the existing handler functions (around line 394):
     ```
     function handleFileClick(submissionId: string) {
       if (!downloadedSubmissionsRef.current.has(submissionId)) {
         downloadedSubmissionsRef.current.add(submissionId);
         setDownloadVersion((v) => v + 1);
       }
     }
     ```

  3. In the file links section (around line 716-733), add an `onClick` handler to each `<a>` tag. The file link is currently:
     ```
     <a href={file.url} target="_blank" rel="noopener noreferrer" ...>
     ```
     Change to:
     ```
     <a href={file.url} target="_blank" rel="noopener noreferrer"
        onClick={() => handleFileClick(selectedSubmission.id)} ...>
     ```
     Do NOT call `e.preventDefault()` -- the link must still open in a new tab as before.

  4. Derive a boolean `hasDownloaded` inside the panel render section, just before the comment thread section (before line 738):
     ```
     const hasDownloaded = downloadedSubmissionsRef.current.has(selectedSubmission.id);
     ```
     Note: `downloadVersion` is read implicitly by React during render to ensure this value is fresh.

  5. Disable the comment textarea (around line 806-818). Add `disabled={!hasDownloaded}` to the textarea element. Also update the placeholder:
     - When `!hasDownloaded`: placeholder="Download at least one file before commenting..."
     - When `hasDownloaded`: placeholder="Write a comment..." (existing)
     Use a ternary for the placeholder prop.
     Add `disabled:bg-slate-50 disabled:cursor-not-allowed` to the textarea className string.

  6. Disable the Post Comment button (around line 823-829). The existing disabled condition is:
     `disabled={commentPosting || !commentBody.trim()}`
     Change to:
     `disabled={commentPosting || !commentBody.trim() || !hasDownloaded}`

  7. Update the "Ctrl+Enter to send" hint (line 820-822). When `!hasDownloaded`, show a help message instead:
     ```
     <span className="text-xs text-slate-400">
       {hasDownloaded ? "Ctrl+Enter to send" : "Download a file to enable commenting"}
     </span>
     ```

  8. Also disable the Ctrl+Enter keyboard shortcut in the textarea onKeyDown handler by adding `!hasDownloaded` guard:
     ```
     onKeyDown={(e) => {
       if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && hasDownloaded) {
         e.preventDefault();
         handlePostComment(selectedSubmission.id);
       }
     }}
     ```

  9. Reset comment-related state in `handlePanelOpenChange` (line 351-358) -- no change needed here since `downloadedSubmissionsRef` persists across panel opens (session-scoped, not panel-scoped). This is correct behavior: once downloaded, stays downloaded for the session.

  Do NOT add any server-side tracking or API changes. This is purely a client-side UX gate.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>
      1. Open coordinator submissions page
      2. Click a submission row to open the slide-over panel
      3. Verify the comment textarea is disabled with placeholder "Download at least one file before commenting..."
      4. Verify the Post Comment button is disabled
      5. Verify the hint text says "Download a file to enable commenting"
      6. Click any file link in the Files section (opens in new tab)
      7. Verify the comment textarea becomes enabled with placeholder "Write a comment..."
      8. Verify the Post Comment button becomes enabled (when text is entered)
      9. Verify the hint text changes to "Ctrl+Enter to send"
      10. Close the panel, reopen the same submission -- commenting should still be enabled (session persists)
      11. Open a different submission that has not had files downloaded -- commenting should be disabled again
    </manual>
  </verify>
  <done>Comment textarea and Post Comment button are disabled until coordinator clicks at least one file download link for the submission. File links still function normally. Tracking is session-scoped per submission.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Comment area is disabled by default when opening a submission panel
- Clicking a file link enables the comment area for that submission
- File links still open in new tab (no behavior change)
- Download tracking persists across panel open/close within the same session
- Different submissions have independent download tracking
</verification>

<success_criteria>
- Coordinator cannot type or submit comments until they download at least one file from the submission
- Clear UX indication (disabled state + helper text) tells coordinator what to do
- No server-side changes required
- No regression to existing file download or comment posting behavior
</success_criteria>

<output>
After completion, create `.planning/quick/16-coordinator-must-download-at-least-one-f/16-SUMMARY.md`
</output>
