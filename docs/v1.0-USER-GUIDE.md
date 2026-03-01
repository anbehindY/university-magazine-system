# User Guide — University Magazine Contribution System

> A comprehensive guide to how each role operates within the system, including user flows, permissions, and persona details.

---

## System Overview

The University Magazine Contribution System is a web-based platform for managing the annual university magazine. Students submit articles and supporting files, Marketing Coordinators review and select contributions, and the Marketing Manager oversees the final publication process.

The system enforces an academic year calendar with two key dates:
- **First Closure Date** — After this date, no new submissions can be created
- **Final Closure Date** — After this date, no changes can be made (no edits, no comments, no file changes)

---

## Roles and Permissions Matrix

| Capability | Student | Coordinator | Manager | Guest | Admin |
|------------|---------|-------------|---------|-------|-------|
| Create submissions | ✅ | — | — | — | — |
| Upload files | ✅ | — | — | — | — |
| Edit own drafts | ✅ | — | — | — | — |
| Submit for review | ✅ | — | — | — | — |
| View faculty submissions | — | ✅ (own faculty) | ✅ (all) | ✅ (own faculty, selected only) | ✅ (all) |
| Add comments | ✅ (own submissions) | ✅ (own faculty) | — | — | — |
| Select for publication | — | ✅ (own faculty) | — | — | — |
| Edit submission notes | — | ✅ (own faculty) | — | — | — |
| Download ZIP | — | — | ✅ | — | — |
| View reports | — | ✅ (own faculty) | ✅ (all) | ✅ (own faculty) | ✅ (all) |
| Switch academic year (reports) | — | — | ✅ | — | ✅ |
| Manage users | — | — | — | — | ✅ |
| Manage academic years | — | — | — | — | ✅ |
| Configure upload rules | — | — | — | — | ✅ |

---

## 1. Student

### Persona

**Who:** University students from any faculty who want to contribute articles, research papers, or creative work to the annual magazine.

**Goal:** Submit their best work before the deadline, respond to coordinator feedback, and get selected for publication.

**Access scope:** Own submissions only. Cannot see other students' work.

### User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sign In    │────▶│  View My     │────▶│  Create New  │────▶│  Upload      │
│              │     │  Submissions │     │  Submission  │     │  Files       │
└──────────────┘     └──────┬───────┘     └──────────────┘     └──────┬───────┘
                            │                                         │
                            │                                         ▼
                            │                                  ┌──────────────┐
                            │                                  │  Save as     │
                            │                                  │  Draft       │
                            │                                  └──────┬───────┘
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │  Open        │                          │  Agree T&C   │
                     │  Submission  │                          │  + Submit    │
                     └──────┬───────┘                          └──────┬───────┘
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │  View        │◀─────────────────────────│  SUBMITTED   │
                     │  Comments    │                          │  Status      │
                     └──────┬───────┘                          └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Reply to    │
                     │  Coordinator │
                     └──────────────┘
```

### Key Rules
- Must agree to Terms & Conditions before submitting
- Cannot create new submissions after the **first closure date**
- Cannot edit or add comments after the **final closure date**
- Can have multiple submissions (both drafts and submitted)
- Can only see and manage their own submissions
- Comments are visible only to the student and their faculty's coordinator

### Typical Session
1. Log in → See list of own submissions
2. Create new submission → Add title → Upload .doc and images
3. Save as draft (can return later to edit)
4. When ready: check T&C → Submit
5. Wait for coordinator feedback → Reply to comments
6. Check if selected for publication

---

## 2. Marketing Coordinator

### Persona

**Who:** Faculty staff member responsible for reviewing student submissions for their assigned faculty. One coordinator per faculty.

**Goal:** Review all submitted work from their faculty, provide feedback through comments, and select the best contributions for the magazine.

**Access scope:** Submissions from their own faculty only. Active academic year only.

### User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sign In    │────▶│  View Faculty │────▶│  Filter /    │
│              │     │  Submissions │     │  Sort List   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Click       │
                     │  Submission  │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  Review  │  │  Add     │  │  Toggle  │
       │  Files   │  │  Comment │  │  Select  │
       └──────────┘  └──────────┘  └─────┬────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │  Confirm     │
                                  │  Selection   │
                                  └──────────────┘
                                         │
              ┌──────────────────────────┘
              ▼
       ┌──────────────┐     ┌──────────────┐
       │  Edit Notes  │     │  View        │
       │  (optional)  │     │  Reports     │
       └──────────────┘     └──────────────┘
```

### Key Rules
- Can only see SUBMITTED submissions (not drafts) from their own faculty
- Can only view the active academic year's submissions
- Selection requires confirmation via modal dialog
- Comments are visible to the student and coordinator only
- Cannot comment after the final closure date
- Receives email notification when a student submits new work

### Submissions Page Features
- **Count badge:** "X submissions" showing total
- **Filter:** All Submissions / Selected Only / Not Selected
- **Sort:** Newest First / Oldest First / Selected First
- **Slide-over panel:** Click a row to see full details, files, notes, and comments

### Typical Session
1. Log in → Check for new submissions (email notifications)
2. Open submission → Download/view files to review the work
3. Add comment with feedback or praise
4. Toggle "Selected for Publication" for best submissions
5. Add notes (internal, for coordinator reference)
6. Check Reports → Exceptions tab to find uncommented submissions

---

## 3. Marketing Manager

### Persona

**Who:** Senior marketing staff member who oversees the entire magazine publication process across all faculties.

**Goal:** Review selected submissions from all faculties, download final materials as a ZIP archive, and monitor contribution statistics.

**Access scope:** All faculties, all academic years. Read-only (no editing or commenting).

### User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sign In    │────▶│  View All    │────▶│  Filter by   │
│              │     │  Submissions │     │  Faculty     │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  Browse  │  │  Download │  │  View    │
       │  Per Year│  │  ZIP     │  │  Reports │
       └──────────┘  └──────────┘  └─────┬────┘
                                         │
                                   ┌─────┴─────┐
                                   ▼           ▼
                            ┌──────────┐ ┌──────────┐
                            │  Stats   │ │ Except.  │
                            │  Tab     │ │ Tab      │
                            └──────────┘ └──────────┘
```

### Key Rules
- Read-only access — cannot edit, select, or comment on submissions
- Can see all faculties across all academic years
- ZIP download organises files as: `Faculty Name / Student Name / filename`
- Can switch academic years in reports via dropdown
- Sees all 5 faculties in the statistics table

### Submissions Page Features
- **Per-year grouping:** Submissions grouped by academic year with section headers
- **Count badges:** "X submissions" per year
- **Faculty filter:** Dropdown to filter by specific faculty
- **Download ZIP:** One button per year section

### Typical Session
1. Log in → Browse selected submissions across all faculties
2. Filter by faculty to review a specific department
3. Download ZIP for the current year when ready for publication
4. Check Reports → Statistics for contribution distribution
5. Check Reports → Exceptions for submissions needing coordinator attention

---

## 4. Guest

### Persona

**Who:** External stakeholders (e.g., industry partners, advisory board members) who are given read-only access to view selected contributions from a specific faculty.

**Goal:** Browse selected articles and view faculty-level statistics.

**Access scope:** Selected submissions from their assigned faculty only. Single academic year. Read-only.

### User Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Sign In    │────▶│  View        │────▶│  Browse      │
│              │     │  Selected    │     │  Articles    │
└──────────────┘     │  Articles   │     └──────────────┘
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  View        │
                     │  Reports     │
                     └──────────────┘
```

### Key Rules
- Can only see submissions that have been **selected for publication**
- Scoped to their assigned faculty — cannot see other faculties
- Completely read-only — no editing, commenting, or selecting
- Reports show their faculty's statistics only
- No year switcher — sees the active year only

### Typical Session
1. Log in → Browse selected articles from their faculty
2. View reports for faculty-level statistics
3. Review exception data (submissions without coordinator comment)

---

## 5. Administrator

### Persona

**Who:** System administrators who manage the platform's configuration, users, and academic year settings.

**Goal:** Set up academic years with closure dates, manage user accounts, and configure upload rules.

**Access scope:** Full system access. Can view all reports and manage all settings.

### User Flow

```
┌──────────────┐     ┌──────────────┐
│   Sign In    │────▶│  Dashboard   │
│              │     │              │
└──────────────┘     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┬──────────────┐
              ▼             ▼             ▼              ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  Manage  │  │  Manage  │  │  Upload  │  │  View    │
       │  Acad.   │  │  Users   │  │  Rules   │  │  Reports │
       │  Years   │  │          │  │          │  │          │
       └─────┬────┘  └──────────┘  └──────────┘  └──────────┘
             │
       ┌─────┴──────────────┐
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  Create New  │     │  Activate /  │
│  Year        │     │  Deactivate  │
└──────────────┘     └──────────────┘
```

### Key Rules
- Can create, edit, and delete academic years
- Can set first and final closure dates per academic year
- Can activate only current or upcoming academic years (not past years)
- Only one academic year can be active at a time
- Can create, edit, ban, and reactivate user accounts
- Can assign roles and faculties to users
- Can configure upload rules (max file size, allowed types, max files)
- Has full access to reports across all faculties and years

### Academic Year Management
- **Create:** Set year label (e.g., "2026-2027"), first closure date, final closure date
- **Activate:** Only current/future years. Automatically deactivates previous active year
- **Dates:** First closure blocks new submissions. Final closure blocks all mutations

### Typical Session
1. Log in → Create new academic year for upcoming period
2. Set closure dates
3. Activate the year when the submission period should begin
4. Manage user accounts as needed (create coordinators, guests)
5. Configure upload rules for the submission period
6. Monitor reports for cross-faculty overview

---

## Academic Year Lifecycle

```
  Create Year          Set Dates           Activate            First Closure        Final Closure
  ┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Admin   │────▶│  Configure   │────▶│  Year is     │────▶│  No new      │────▶│  No changes  │
  │  creates │     │  closure     │     │  ACTIVE      │     │  submissions │     │  at all      │
  │  year    │     │  dates       │     │              │     │  allowed     │     │              │
  └─────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                              │                     │                     │
                                              ▼                     ▼                     ▼
                                       Students submit      Students can edit      Manager downloads
                                       new work             existing work          ZIP of selections
                                       Coordinators         Coordinators can       All data frozen
                                       receive emails       still comment
```

### Timeline Example (2025-2026)

| Period | Students Can... | Coordinators Can... | Manager Can... |
|--------|----------------|---------------------|----------------|
| Sep 2025 – Mar 15, 2026 | Create new submissions, edit drafts, upload files, submit, comment | Review, comment, select, edit notes | View submissions, view reports |
| Mar 16 – Apr 15, 2026 | Edit existing submissions, comment on existing threads | Review, comment, select, edit notes | View submissions, view reports |
| After Apr 15, 2026 | View only (no changes) | View only (no changes) | Download ZIP, view reports |

---

## Navigation Reference

### Sidebar Links by Role

| Page | Student | Coordinator | Manager | Guest | Admin |
|------|---------|-------------|---------|-------|-------|
| Dashboard | — | ✅ | ✅ | ✅ | ✅ |
| My Submissions | ✅ (`/submissions`) | — | — | — | — |
| Faculty Submissions | — | ✅ (`/coordinator/submissions`) | ✅ (`/manager/submissions`) | ✅ (`/guest/submissions`) | — |
| Reports | — | ✅ (`/reports`) | ✅ (`/reports`) | ✅ (`/reports`) | ✅ (`/reports`) |
| Admin | — | — | — | — | ✅ (`/admin`) |
| Users | — | — | — | — | ✅ (`/users`) |
| Upload Rules | — | — | — | — | ✅ (`/admin/upload-rules`) |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Submission** | A student's contribution to the magazine (article, research paper, creative work) |
| **Draft** | A submission saved but not yet submitted for review |
| **Submitted** | A submission that has been formally submitted for coordinator review |
| **Selected** | A submission chosen by the coordinator for publication in the magazine |
| **First Closure Date** | Deadline after which no new submissions can be created |
| **Final Closure Date** | Deadline after which no changes can be made to any submission |
| **Exception** | A submitted contribution that has not received any coordinator comment |
| **Overdue Exception** | An exception where the submission was made more than 14 days before the final closure date without receiving a comment |
| **Academic Year** | The annual period (e.g., 2025-2026) that groups submissions and closure dates |
| **Active Year** | The currently active academic year — the one students submit to |
