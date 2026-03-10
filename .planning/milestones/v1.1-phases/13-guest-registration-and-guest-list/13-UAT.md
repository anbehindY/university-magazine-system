---
status: complete
phase: 13-guest-registration-and-guest-list
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md]
started: "2026-03-10T00:35:00Z"
updated: "2026-03-10T00:40:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Guest Registration Form
expected: Navigate to /register (or click "Register as Guest" on the sign-in page). You should see a registration form with Name, Email, Password, Confirm Password fields, and a Faculty dropdown with a Register button.
result: pass
note: Initially blocked by middleware (proxy.ts) redirecting /register to /sign-in — fixed by adding register to matcher exclusion list.

### 2. Email Uniqueness Check
expected: On the registration form, enter an email that already exists (e.g., any seeded user email). After leaving the email field, you should see an inline message saying the email is already taken.
result: pass

### 3. Successful Registration
expected: Fill in the form with a new email, valid name, matching passwords (8+ chars), and select a faculty. On submit, you should be redirected to the sign-in page with a success message/toast.
result: pass

### 4. Sign-In Link on Registration Page
expected: On the sign-in page, there should be a "Register as Guest" link that takes you to the registration form.
result: pass

### 5. Coordinator Guest List Page
expected: Log in as a coordinator. In the sidebar, you should see a "Guest List" item. Click it to see a table showing guest users from your faculty with columns: Name, Email, Registration Date, Faculty.
result: pass

### 6. Guest List Search
expected: On the coordinator guest list page, type a name or email in the search box. The table should filter to show only matching guests.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
