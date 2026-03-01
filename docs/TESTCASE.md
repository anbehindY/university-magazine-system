# Test Cases — v1.0 MVP

> Comprehensive test cases for verifying all user workflows in the University Magazine Contribution System.

**Test Environment:** http://localhost:3000
**Default Password:** `password` (all seeded accounts)

---

## 1. Authentication

### TC-AUTH-01: Student Login
- **Steps:** Navigate to `/sign-in` → Enter `david.park@uog.com` / `password` → Click Sign In
- **Expected:** Redirected to student submissions page (`/submissions`). Sidebar shows student navigation.

### TC-AUTH-02: Coordinator Login
- **Steps:** Navigate to `/sign-in` → Enter `tom.baker@uog.com` / `password` → Click Sign In
- **Expected:** Redirected to management dashboard (`/`). Sidebar shows Submissions link for coordinator.

### TC-AUTH-03: Manager Login
- **Steps:** Navigate to `/sign-in` → Enter `michael.chen@uog.com` / `password` → Click Sign In
- **Expected:** Redirected to management dashboard. Sidebar shows Submissions and Reports links.

### TC-AUTH-04: Admin Login
- **Steps:** Navigate to `/sign-in` → Enter `sarah.johnson@uog.com` / `password` → Click Sign In
- **Expected:** Redirected to management dashboard. Sidebar shows Admin, Users, Reports, and Upload Rules links.

### TC-AUTH-05: Guest Login
- **Steps:** Navigate to `/sign-in` → Enter `guest.eng@uog.com` / `password` → Click Sign In
- **Expected:** Redirected to management dashboard. Sidebar shows Submissions (read-only) and Reports links.

### TC-AUTH-06: Invalid Credentials
- **Steps:** Navigate to `/sign-in` → Enter invalid email/password → Click Sign In
- **Expected:** Error message displayed. User stays on sign-in page.

---

## 2. Student Workflow

### TC-STU-01: View Submissions List
- **Login as:** `david.park@uog.com`
- **Steps:** Navigate to `/submissions`
- **Expected:** See list of own submissions with title, status badge, and dates. Should see both DRAFT and SUBMITTED entries.

### TC-STU-02: Create New Submission (Draft)
- **Login as:** Any student (e.g., `alice.wong@uog.com`)
- **Steps:** Click "New Submission" → Enter title → Upload a .doc file and an image → Save as Draft
- **Expected:** Submission created with DRAFT status. Files uploaded to Vercel Blob. Appears in submissions list.

### TC-STU-03: Submit a Draft
- **Login as:** Any student with a DRAFT submission
- **Steps:** Open a draft → Check "I agree to Terms and Conditions" → Click Submit
- **Expected:** Status changes to SUBMITTED. `submittedAt` timestamp recorded. Cannot create new submissions if past first closure date.

### TC-STU-04: Edit Draft Before Submission
- **Login as:** Any student with a DRAFT
- **Steps:** Open draft → Change title → Add/remove files → Save
- **Expected:** Changes saved. Draft updated with new files.

### TC-STU-05: Cannot Submit Without T&C Agreement
- **Login as:** Any student
- **Steps:** Open a draft → Do NOT check T&C → Click Submit
- **Expected:** Error: must agree to Terms and Conditions. Status remains DRAFT.

### TC-STU-06: View Comment Thread
- **Login as:** `david.park@uog.com`
- **Steps:** Open a SUBMITTED submission that has coordinator comments
- **Expected:** Comment thread visible with coordinator's comment and any replies.

### TC-STU-07: Reply to Coordinator Comment
- **Login as:** `david.park@uog.com`
- **Steps:** Open submission with comments → Type reply → Send
- **Expected:** Reply appears in thread immediately. Reply shows student name and role.

### TC-STU-08: Cannot Edit After Final Closure
- **Login as:** Any student
- **Pre-condition:** Final closure date has passed for the academic year
- **Steps:** Try to update any submission
- **Expected:** 403 error. Submission unchanged.

### TC-STU-09: Cannot Submit After First Closure
- **Login as:** Any student
- **Pre-condition:** First closure date has passed for active academic year
- **Steps:** Try to create a new submission
- **Expected:** 403 error. No submission created.

### TC-STU-10: Download Own Files
- **Login as:** Any student
- **Steps:** Open a submission → Click on uploaded file
- **Expected:** File downloads or opens in new tab.

---

## 3. Coordinator Workflow

### TC-COORD-01: View Faculty Submissions
- **Login as:** `tom.baker@uog.com` (Engineering coordinator)
- **Steps:** Navigate to `/coordinator/submissions`
- **Expected:** See only SUBMITTED submissions from Engineering students. Count badge shows total. No submissions from other faculties visible.

### TC-COORD-02: Filter Submissions
- **Steps:** Use filter dropdown → Select "Selected Only"
- **Expected:** Only submissions with `isSelected = true` shown. "Showing X of Y" badge appears.
- **Steps:** Select "Not Selected"
- **Expected:** Only unselected submissions shown.

### TC-COORD-03: Sort Submissions
- **Steps:** Change sort to "Oldest First"
- **Expected:** Submissions reordered by submission date ascending.
- **Steps:** Change to "Selected First"
- **Expected:** Selected submissions appear at top.

### TC-COORD-04: Open Submission Detail
- **Steps:** Click any submission row
- **Expected:** Slide-over panel opens with submission title, student name, status, notes, files, and comment thread.

### TC-COORD-05: Select for Publication
- **Steps:** In slide-over, toggle "Selected for Publication" switch → Confirm in modal
- **Expected:** Confirmation dialog appears with appropriate button (Confirm/Remove). After confirming, toast notification shows. Submission marked as selected.

### TC-COORD-06: Deselect Submission
- **Steps:** Toggle off "Selected for Publication" on a selected submission → Confirm
- **Expected:** Confirmation dialog with red "Remove" button. After confirming, submission deselected. Toast notification.

### TC-COORD-07: Edit Notes
- **Steps:** In slide-over, edit the notes field → Click Save
- **Expected:** Notes saved. Visible on next load.

### TC-COORD-08: Add Comment
- **Steps:** In slide-over, scroll to comment thread → Type comment → Send
- **Expected:** Comment appears immediately in thread with coordinator name and role badge.

### TC-COORD-09: View Files and Download
- **Steps:** In slide-over, scroll to Files section
- **Expected:** Files listed with name, size, and download icon. Clicking opens/downloads the file.

### TC-COORD-10: Cannot See Other Faculty Submissions
- **Login as:** `tom.baker@uog.com` (Engineering)
- **Steps:** Try to access Science faculty submissions via API
- **Expected:** Only Engineering submissions returned. Other faculties not accessible.

### TC-COORD-11: Only Active Year Submissions
- **Login as:** `tom.baker@uog.com`
- **Steps:** View coordinator submissions page
- **Expected:** Only 2025-2026 (active year) submissions shown. No year switcher visible.

### TC-COORD-12: Email on New Submission
- **Pre-condition:** SMTP configured
- **Steps:** A student in Engineering submits a new draft → transitions to SUBMITTED
- **Expected:** Coordinator `tom.baker@uog.com` receives email notification.

---

## 4. Marketing Manager Workflow

### TC-MGR-01: View All Faculty Submissions
- **Login as:** `michael.chen@uog.com`
- **Steps:** Navigate to `/manager/submissions`
- **Expected:** See submissions from all faculties, grouped by academic year. Each year section has count badge and Download ZIP button.

### TC-MGR-02: Filter by Faculty
- **Steps:** Use faculty dropdown → Select "Faculty of Engineering"
- **Expected:** Only Engineering submissions shown across all year groups.

### TC-MGR-03: View All Academic Years
- **Steps:** Check year group headers
- **Expected:** 2023-2024, 2024-2025, and 2025-2026 sections visible with submission counts.

### TC-MGR-04: Download ZIP (Past Year)
- **Steps:** Click "Download ZIP" on the 2024-2025 section
- **Expected:** ZIP file downloads with name `selected-submissions-2024-2025.zip`. Contains files organised by Faculty > Student.

### TC-MGR-05: Download ZIP (Current Year)
- **Steps:** Click "Download ZIP" on the 2025-2026 section
- **Expected:** ZIP download works (closure date check removed for manager convenience).

### TC-MGR-06: Submission Count Badges
- **Steps:** Check count badges on each year section
- **Expected:** Badge shows "X submissions" with correct count. Singular "1 submission" when appropriate.

### TC-MGR-07: Read-Only View
- **Steps:** Click on any submission
- **Expected:** No edit controls, no selection toggle, no comment input. View is purely read-only.

---

## 5. Guest Workflow

### TC-GUEST-01: View Selected Submissions
- **Login as:** `guest.eng@uog.com` (Engineering guest)
- **Steps:** Navigate to `/guest/submissions`
- **Expected:** See only SELECTED submissions from Faculty of Engineering. "X articles" badge shown.

### TC-GUEST-02: Cannot See Other Faculty
- **Login as:** `guest.eng@uog.com`
- **Steps:** Check available submissions
- **Expected:** Only Engineering faculty submissions visible. No faculty filter or dropdown.

### TC-GUEST-03: Read-Only View
- **Steps:** Browse submissions
- **Expected:** No edit, comment, or selection controls. Purely read-only viewing.

### TC-GUEST-04: Access Reports
- **Login as:** `guest.eng@uog.com`
- **Steps:** Navigate to `/reports`
- **Expected:** Reports page loads with statistics for Engineering faculty only. No year dropdown (static year label).

---

## 6. Administrator Workflow

### TC-ADMIN-01: View Admin Dashboard
- **Login as:** `sarah.johnson@uog.com`
- **Steps:** Navigate to `/admin`
- **Expected:** Academic year management interface with form and history table.

### TC-ADMIN-02: Create Academic Year
- **Steps:** Enter year label (e.g., "2026-2027") → Set closure dates → Save
- **Expected:** New academic year created. Appears in history table as inactive.

### TC-ADMIN-03: Activate Academic Year
- **Steps:** Click "Activate" on a current/upcoming year
- **Expected:** Year becomes active. Previous active year deactivated. Active badge shown.

### TC-ADMIN-04: Cannot Activate Past Year
- **Steps:** Try to activate "2023-2024"
- **Expected:** Error: "Cannot activate a past academic year. Only current or upcoming years can be set as active."

### TC-ADMIN-05: Manage Users
- **Steps:** Navigate to `/users`
- **Expected:** User list with all accounts. Can search, filter by role, and view details.

### TC-ADMIN-06: Upload Rules
- **Steps:** Navigate to `/admin/upload-rules`
- **Expected:** Configure max file size, allowed file types, max files per submission.

---

## 7. Reports

### TC-RPT-01: Statistics Tab — Manager View
- **Login as:** `michael.chen@uog.com`
- **Steps:** Navigate to `/reports` → Statistics tab
- **Expected:** 3 summary cards (Total Submissions, Total Contributors, Faculties). Below: sortable data table with all 5 faculties showing counts, percentages, and contributors.

### TC-RPT-02: Statistics Tab — Coordinator View
- **Login as:** `tom.baker@uog.com`
- **Steps:** Navigate to `/reports`
- **Expected:** Single-faculty card view for Engineering only. Shows Submissions, Contributors, and Share of Total cards.

### TC-RPT-03: Statistics Tab — Guest View
- **Login as:** `guest.eng@uog.com`
- **Steps:** Navigate to `/reports`
- **Expected:** Same single-faculty card view as coordinator, but for Engineering only.

### TC-RPT-04: Year Selector — Manager
- **Login as:** `michael.chen@uog.com`
- **Steps:** Change academic year dropdown to "2024-2025"
- **Expected:** Statistics reload for 2024-2025 data. Numbers change to reflect that year.

### TC-RPT-05: Year Selector — Coordinator
- **Login as:** `tom.baker@uog.com`
- **Steps:** Check year display
- **Expected:** Static year label (not a dropdown). Shows active year only.

### TC-RPT-06: Exceptions Tab — All Exceptions
- **Login as:** `michael.chen@uog.com`
- **Steps:** Click Exceptions tab
- **Expected:** Summary cards (Total Exceptions, Overdue, Awaiting Comment). Table showing submissions with no coordinator comment.

### TC-RPT-07: Exceptions Tab — Overdue Toggle
- **Steps:** Click "Overdue" toggle button
- **Expected:** Only submissions with >14 days without comment shown.

### TC-RPT-08: Exception Detail Slide-Over
- **Steps:** Click any exception row
- **Expected:** Slide-over with title, status badge (Overdue or Awaiting Comment), detail fields (Student, Faculty, Submitted date, Waiting Days). Files listed with download links.

### TC-RPT-09: Waiting Label — Active Year
- **Steps:** View exception detail for active year (2025-2026)
- **Expected:** Field label shows "Waiting for Comment".

### TC-RPT-10: Waiting Label — Past Year
- **Steps:** Switch to 2024-2025 → View exception detail
- **Expected:** Field label shows "Waited for Comment".

### TC-RPT-11: Reports — Coordinator Faculty Scope
- **Login as:** `jessica.williams@uog.com` (Science coordinator)
- **Steps:** Navigate to Reports → Exceptions tab
- **Expected:** Only Science faculty exceptions shown. No other faculties visible.

---

## 8. Cross-Role Scenarios

### TC-CROSS-01: Submission Lifecycle
1. **Student** creates draft → uploads files → submits
2. **Coordinator** receives email → opens submission → adds comment
3. **Student** replies to comment
4. **Coordinator** selects for publication
5. **Manager** sees selected submission → downloads ZIP
6. **Guest** sees selected submission in read-only view
7. **Reports** show updated statistics

### TC-CROSS-02: Exception Report Accuracy
1. **Student** submits a contribution
2. **Coordinator** does NOT comment (wait >14 days)
3. **Manager** views Reports → Exceptions tab
4. **Expected:** Submission appears as "Overdue" exception with correct waiting days

### TC-CROSS-03: Faculty Isolation
1. **Coordinator A** (Engineering) tries to access Science submissions
2. **Guest A** (Engineering) tries to access Business submissions
3. **Expected:** Both get empty results or 403. Faculty isolation enforced.

### TC-CROSS-04: Closure Date Enforcement
1. **Admin** sets first closure date to yesterday
2. **Student** tries to create new submission → Blocked (403)
3. **Student** tries to edit existing draft → Still allowed
4. **Admin** sets final closure date to yesterday
5. **Student** tries to edit anything → Blocked (403)
6. **Coordinator** tries to add comment → Blocked (403)

---

## 9. Edge Cases

### TC-EDGE-01: Empty Faculty
- **Steps:** Create a new faculty with no students or submissions → View reports
- **Expected:** Faculty appears in stats with 0 submissions, 0 contributors, 0%.

### TC-EDGE-02: Student with No Faculty
- **Steps:** Attempt API calls without faculty assignment
- **Expected:** Appropriate error handling. No crashes.

### TC-EDGE-03: Large File Upload
- **Steps:** Upload a file near the max allowed size
- **Expected:** Upload succeeds if within limits. Error if exceeds.

### TC-EDGE-04: Concurrent Selection Toggle
- **Steps:** Two coordinators try to toggle selection on same submission simultaneously
- **Expected:** Last write wins. No data corruption.

### TC-EDGE-05: Long Comment Thread
- **Steps:** Create 20+ comments on a single submission
- **Expected:** Thread remains scrollable. Performance acceptable.

---

## Test Account Quick Reference

| Role | Email | Faculty |
|------|-------|---------|
| Admin | sarah.johnson@uog.com | Business |
| Manager | michael.chen@uog.com | All |
| Coordinator | tom.baker@uog.com | Engineering |
| Coordinator | james.taylor@uog.com | Business |
| Coordinator | lisa.nguyen@uog.com | Arts & Humanities |
| Coordinator | jessica.williams@uog.com | Science |
| Coordinator | anna.patel@uog.com | Medicine |
| Guest | guest.eng@uog.com | Engineering |
| Guest | guest.biz@uog.com | Business |
| Guest | guest.sci@uog.com | Science |
| Guest | priya.shah@uog.com | Medicine |
| Student | david.park@uog.com | Engineering |
| Student | alice.wong@uog.com | Science |
| Student | emily.rodriguez@uog.com | Arts & Humanities |
| Student | diana.lee@uog.com | Business |
| Student | ethan.moore@uog.com | Medicine |
