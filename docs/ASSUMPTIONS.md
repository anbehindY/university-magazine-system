# Assumptions — University Magazine Contribution System

## Assumptions

- The system has five fixed roles: Administrator, Marketing Manager, Marketing Coordinator, Student, and Guest.
- Each user belongs to exactly one faculty, except the Administrator and Marketing Manager who operate across all faculties.
- The Administrator creates all user accounts (students, coordinators, managers) before the system is used, so the database is pre-seeded with existing accounts that are already assigned to their respective faculties.
- Guest users can also self-register through a public registration page, choosing their own faculty and password.
- Guest accounts are immediately active after registration and do not require an approval step; the Administrator can ban accounts if needed.
- The Administrator cannot create guest accounts; the GUEST role is exclusively assigned through self-registration.
- Only admin-created users are required to change their temporary password on first login; self-registered guests chose their own password and skip this step.
- When a coordinator "edits" a contribution, this means editing metadata such as notes and title only, not replacing the student's uploaded files.
- Comments are two-way threads at the submission level, not attached to individual files within a submission.
- "Selected for publication" is a simple boolean flag that a coordinator toggles on or off, not a multi-stage approval workflow.
- The ZIP download for the Marketing Manager includes all files from selected submissions, organised into a Faculty > Student > files folder hierarchy.
- The first closure date blocks new submissions from being created, while the final closure date blocks all updates including comments and file changes.
- Reports are role-scoped so that coordinators and guests only see data for their own faculty, while the manager and administrator see data across all faculties.
- The 14-day exception report measures the time between a student's submission date and the final closure date to identify contributions without coordinator comments.
- The system uses Gmail SMTP for email notifications during development and testing, not for production-scale delivery.
- ZIP archives are generated on demand when the manager requests a download, rather than being pre-generated in the background.
- Comment updates use SWR with 15-second polling rather than real-time WebSocket or Server-Sent Events, since the use case is low-frequency.
- Responsive design via Tailwind CSS satisfies the requirement that the interface must be suitable for all devices including mobile phones, tablets, and desktops.
- The analytics requirement for "which pages are most viewed" is satisfied by active user counts and browser usage charts derived from existing session data, rather than implementing a separate page-view tracking system.
- The audit log for coordinator selection changes is append-only, meaning entries cannot be edited or deleted after creation.
- Guest self-registration hardcodes the GUEST role on the server side and never reads the role from the request body, preventing privilege escalation.
- Users can update their own display name and change their password through a self-service profile page; email, role, and faculty are read-only and can only be changed by an administrator.
- The database is seeded with sample data including multiple students, coordinators, a manager, an administrator, and guest accounts across five faculties, along with sample academic years, submissions, comments, and audit log entries to support testing and demonstration.
