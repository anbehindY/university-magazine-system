---
status: complete
phase: 05-ui-layer
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md]
started: 2026-03-01T12:00:00Z
updated: 2026-03-01T12:00:00Z
---

## Current Test

All tests complete.

## Tests

### 1. Coordinator Submissions — Filtering and Sorting
expected: Log in as coordinator (tom.baker@uog.com / password). Navigate to /coordinator/submissions. You should see a header with total count badge (e.g. "3 submissions"). Below the header, two dropdowns: a filter (All Submissions / Selected Only / Not Selected) and a sort (Newest First / Oldest First / Selected First). Changing the filter should show a "Showing X of Y" badge. Changing the sort should reorder the table rows.
result: pass

### 2. Coordinator Selection Confirmation Modal
expected: In the coordinator submissions page, click a submission row to open the slide-over. Toggle the "Selected for Publication" switch. A confirmation dialog should appear asking "Are you sure you want to select/remove this submission?" with Cancel and Confirm/Remove buttons. The dialog should have a red button for removal and a dark button for selection. Clicking Cancel should close the dialog without changes.
result: pass (fixed button gap + added toast after action + added file download list in slide-over)

### 3. Manager Submissions — Per-Year Grouping
expected: Log in as manager (michael.chen@uog.com / password). Navigate to /manager/submissions. Submissions should be grouped by academic year with section headers (e.g. "2025-2026") and each section shows a count badge (e.g. "7 submissions") and its own "Download ZIP" button. The faculty filter dropdown still works across all year groups.
result: pass

### 4. Manager ZIP Download Per Year
expected: On the manager submissions page, click the "Download ZIP" button on any year section. The button should show a loading spinner while downloading and attempt to download a ZIP file named after that academic year (e.g. "selected-submissions-2025-2026.zip"). Other year download buttons should be disabled during the download.
result: pass

### 5. Reports — All Academic Years in Dropdown
expected: Navigate to /reports. The academic year dropdown should list ALL academic years (not just the active one), sorted with the most recent first. Selecting a different year should reload the statistics and exceptions data for that year.
result: pass

### 6. Reports Statistics — Coordinator Single-Faculty View
expected: Log in as coordinator (tom.baker@uog.com / password). Navigate to /reports. The Statistics tab should show your faculty name with an icon, then 3 stat cards: Submissions (with blue icon), Contributors (with green icon), and Share of Total percentage (with purple icon). There should be NO multi-faculty table — just these focused cards for your faculty.
result: pass

### 7. Reports Statistics — Manager Multi-Faculty View
expected: Log in as manager (michael.chen@uog.com / password). Navigate to /reports. The Statistics tab should show 3 summary cards (Total Submissions, Total Contributors, Faculties) each with colored icons. Below the cards, a sortable per-faculty data table with all faculties listed.
result: pass

### 8. Reports Exceptions — Summary Cards and UX
expected: On the reports page, click the Exceptions tab. You should see 3 summary cards at the top: Total Exceptions (amber icon), Overdue (red icon with count), and Awaiting Comment (blue icon). Below the cards, toggle buttons with count badges. The "Waiting" column should show human-friendly labels like "14 days" or "Today" instead of bare numbers.
result: pass

### 9. Reports Exceptions — Detail Slide-Over
expected: On the Exceptions tab, click any exception row. A slide-over panel should open showing the submission title, a status badge (red "Overdue" or amber "Awaiting comment"), and read-only detail fields (Student, Faculty, Submitted date, Waiting time). There should be no edit controls — the view is completely read-only.
result: pass (added file downloads, fixed waiting calc to use closure date, renamed column to "Waiting Days", conditional "Waited for Comment" label for inactive years)

### 10. Submission Count Labels
expected: Check count badges across all pages: coordinator submissions should show "X submissions", manager submissions should show "X submissions" per year group and in the header, guest page should show "X articles". All counts should include the unit label, not just a bare number.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
