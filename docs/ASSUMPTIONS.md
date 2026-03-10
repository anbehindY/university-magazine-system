# Assumptions — University Magazine Contribution System

## Assumptions

- "Editing" by a coordinator means metadata (notes, title) only — not replacing student files
- Comments are two-way threads at the submission level, not per-file
- "Selected for publication" is a simple boolean flag (not a multi-stage workflow)
- ZIP includes all files from selected submissions, organised by Faculty > Student > files
- First closure blocks new submissions; final closure blocks ALL updates including comments
- Reports are role-scoped: coordinator/guest see their faculty; manager/admin see all
- Exception "14 days" measures from student's submittedAt to finalClosureDate
- 5 fixed roles: Administrator, Marketing Manager, Marketing Coordinator, Student, Guest
- Each user belongs to exactly one faculty (except Admin and Manager who are cross-faculty)
- Admin creates user accounts; guests can also self-register (v1.1)
- Guest accounts are immediately active after registration (no approval gate)
- Gmail SMTP is for testing/development only, not production email delivery
- On-demand ZIP generation (no pre-generated archives)
- SWR with 15s polling is sufficient for comment updates (no WebSocket/SSE needed)
- Responsive design via Tailwind CSS satisfies "suitable for all devices"
- "Which pages are most viewed" is satisfied by active user analytics from session data rather than per-page tracking
- Only admin-created users need forced password change; self-registered guests chose their own password
- Audit log is append-only (no update or delete operations)
- Guest self-registration hardcodes GUEST role server-side to prevent privilege escalation
