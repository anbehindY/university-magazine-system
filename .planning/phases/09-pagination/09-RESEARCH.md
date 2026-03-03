# Phase 9: Pagination - Research

**Researched:** 2026-03-03
**Domain:** Server-side pagination for Next.js 16 App Router API routes + React client state
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Pagination controls style**
- Numbered page buttons — show page numbers with ellipsis for large ranges (e.g. 1 2 3 … 12)
- Include Prev / Next navigation alongside numbered buttons

**Page size**
- Default page size: 10 rows
- User-selectable: 10 / 25 / 50 options
- The page size selector should be visible near the table controls

**Which tables**
- User management table is confirmed in scope
- Planner should analyze all other table views in the app and include pagination for any with unbounded row counts (e.g. submissions list, if applicable)
- Criterion: if the table can realistically grow to 50+ rows in production, paginate it

**URL / state persistence**
- Component state only — current page and page size do NOT need to live in the URL
- Page resets to 1 on refresh is acceptable

### Claude's Discretion
- Placement of controls (above vs below table — optimize for best UX per table)
- Number of visible page buttons before ellipsis truncation
- API query parameter naming (page/pageSize or skip/take — match existing patterns)
- Loading state handling (skeleton vs spinner — match existing patterns)

### Deferred Ideas (OUT OF SCOPE)
- URL-based pagination state (bookmarkable pages) — noted for future if needed
- Search and filtering on paginated tables — separate phase if required
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Admin user management table supports server-side pagination with page controls and configurable page size | API must accept `page` and `pageSize` query params; Prisma `skip`/`take` + `count()` pattern; shadcn/ui Select for page size; custom pagination controls component |
| UX-02 | Other table views with potentially unbounded rows (identified during Phase 9 planning) also support pagination | Table-by-table analysis below identifies which views qualify for pagination; same implementation pattern applies |
</phase_requirements>

---

## Summary

Phase 9 adds server-side pagination to the admin user management table (UX-01) and any other table that can realistically grow to 50+ rows in production (UX-02). The project already uses Next.js 16 App Router, Prisma 7, and shadcn/ui with React 19 — all pagination work is pure extension of existing patterns with no new dependencies.

Server-side pagination in this stack means: the API route accepts `page` and `pageSize` as URL query parameters, uses Prisma `findMany` with `skip`/`take` to fetch only one page of data, runs a parallel `count()` to get the total row count, and returns `{ items, total, page, pageSize }`. The client holds `page` and `pageSize` in React `useState`, re-fetches when either changes, and renders a pagination controls component with Prev/Next buttons, numbered page buttons with ellipsis truncation, and a page-size selector. No new library is needed — the pattern is standard and can be built from existing shadcn/ui `Button` and `Select` components.

The codebase analysis reveals that only the **admin user management table** and the **coordinator submissions table** are realistic candidates for pagination from an unbounded-growth perspective. All other tables are bounded by faculty scope, academic year scope, or per-student scope. The manager's "selected submissions" view is cross-faculty and cross-year but only shows selected submissions, which is likely a small subset. The exceptions report is scoped per academic year. The planner should make the final call on coordinator and manager submissions, but this research recommends only the admin users table as definitively requiring pagination.

**Primary recommendation:** Use Prisma `skip`/`take` + `count()` for the API; component-state `page`/`pageSize` on the client; build a shared `PaginationControls` component using existing shadcn/ui `Button` and `Select` components; use `page`/`pageSize` as query parameter names to match clarity of intent.

---

## Table Analysis: Which Tables Need Pagination?

This answers the planner's obligation under UX-02 to identify all unbounded tables.

| Table | Location | Max Realistic Rows | Verdict |
|-------|----------|--------------------|---------|
| Admin user management | `/app/(management)/users/page.tsx` | Unbounded — all users in system across all faculties | **PAGINATE (UX-01)** |
| Coordinator submissions | `/app/(management)/coordinator/submissions/page.tsx` | Bounded: active year only + faculty scope; ~20–50 students/faculty/year | **BORDERLINE** — recommend paginate if > 50 students/faculty is realistic |
| Manager selected submissions | `/app/(management)/manager/submissions/page.tsx` | Cross-faculty, all years, but only selected submissions — typically ≤ 10% of all submissions; grouped by year visually | **DO NOT PAGINATE** — year grouping acts as natural partitioning; pagination would break group-by-year layout |
| Guest selected submissions | `/app/(management)/guest/submissions/page.tsx` | Faculty-scoped selected submissions only — very bounded | **DO NOT PAGINATE** |
| Student submissions | `/app/(student)/submissions/page.tsx` | Per-student — 1-3 submissions per student, max maybe 10 | **DO NOT PAGINATE** |
| Exception report | `/app/(management)/reports/page.tsx` (exceptions tab) | Per-academic-year, submissions with no coordinator comment — bounded per year | **DO NOT PAGINATE** |
| Statistics report | `/app/(management)/reports/page.tsx` (statistics tab) | One row per faculty — number of faculties is the bound | **DO NOT PAGINATE** |

**Confirmed in-scope tables: Admin user management (UX-01). Coordinator submissions is borderline — planner should include if the criterion of "realistically 50+ rows" is met given per-faculty student counts.**

---

## Standard Stack

### Core (no new dependencies required)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Prisma `findMany` with `skip`/`take` | 7.3.0 (already installed) | Fetch one page of rows from the DB | Native Prisma offset pagination pattern |
| Prisma `count()` | 7.3.0 (already installed) | Get total row count for page calculation | Required to know total pages |
| React `useState` | 19 (already installed) | Hold `page` and `pageSize` client-side | Component state per CONTEXT.md decision |
| shadcn/ui `Button` | already installed | Prev/Next and numbered page buttons | Already in project |
| shadcn/ui `Select` | already installed | Page size selector (10/25/50) | Already in project, matches existing Select pattern |

### No New Libraries Needed

The project already has everything required. Do not add `react-paginate`, `@tanstack/react-query`, or any pagination library — they add unnecessary dependencies for a self-contained pagination UI built from existing primitives.

**Installation:**
```bash
# No new packages — all dependencies already installed
```

---

## Architecture Patterns

### Recommended File Structure

No new directories are needed. Changes are contained to:

```
app/
├── api/
│   └── admin/
│       └── users/
│           └── route.ts          # Modify GET: accept page/pageSize, return total
│   └── coordinator/              # Modify if coordinator submissions are in scope
│       └── submissions/
│           └── route.ts          # Modify GET: accept page/pageSize, return total
├── (management)/
│   └── users/
│       └── page.tsx              # Modify: add pagination state + PaginationControls
│   └── coordinator/
│       └── submissions/
│           └── page.tsx          # Modify if in scope
components/
└── ui/
    └── pagination-controls.tsx   # NEW: shared pagination controls component
```

### Pattern 1: API Route — Offset Pagination with Count

**What:** Accept `page` and `pageSize` as query params. Use `skip`/`take` in Prisma. Run `count()` in parallel to avoid extra roundtrip. Return `{ users, total, page, pageSize }`.

**When to use:** Every paginated API endpoint in this phase.

```typescript
// app/api/admin/users/route.ts (modified GET handler)
// Source: Prisma docs https://www.prisma.io/docs/orm/prisma-client/queries/pagination

export async function GET(req: NextRequest) {
  // ... auth check ...

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = (() => {
    const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
    return [10, 25, 50].includes(raw) ? raw : 10;
  })();
  const skip = (page - 1) * pageSize;

  // Run count and page fetch in parallel
  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: { /* existing select */ },
    }),
  ]);

  return NextResponse.json({ users: usersWithLastActive, total, page, pageSize }, { status: 200 });
}
```

**Key points:**
- Validate `page` and `pageSize` server-side — clamp to valid values, never trust client input
- `pageSize` must be one of the allowed values (10, 25, 50) — reject others with a fallback, not a 400
- Run `count()` and `findMany()` in `Promise.all` — parallel execution, no extra roundtrip
- Keep `orderBy` consistent so pages don't shuffle between requests

### Pattern 2: Client State — Page + PageSize in useState

**What:** Two pieces of state (`page`, `pageSize`) drive the fetch URL. When either changes, re-fetch. Reset `page` to 1 when `pageSize` changes.

**When to use:** Every paginated table component.

```typescript
// app/(management)/users/page.tsx (relevant state and fetch)

const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [total, setTotal] = useState(0);
// ... existing loading/error/users state ...

// Fetch triggered by page or pageSize changes
useEffect(() => {
  let cancelled = false;

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?page=${page}&pageSize=${pageSize}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error || "Failed to load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      if (!cancelled) {
        setError("Failed to load users.");
        setUsers([]);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  fetchUsers();
  return () => { cancelled = true; };
}, [page, pageSize, isPending, session?.user?.role]);

function handlePageSizeChange(newSize: number) {
  setPageSize(newSize);
  setPage(1); // Reset to page 1 when page size changes
}
```

### Pattern 3: PaginationControls Component

**What:** A shared, stateless component that renders Prev/Next buttons, numbered page buttons with ellipsis, and current page display. The parent passes `page`, `pageSize`, `total`, and callbacks.

**When to use:** Every paginated table. Build once, reuse everywhere.

```typescript
// components/ui/pagination-controls.tsx

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationControlsProps) {
  const totalPages = Math.ceil(total / pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Generate page number array with ellipsis
  // e.g. [1, 2, 3, "...", 12] or [1, "...", 5, 6, 7, "...", 12]
  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {/* Row count info */}
      <p className="text-sm text-slate-500">
        {total === 0
          ? "No results"
          : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </p>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-20 border-slate-200 bg-white text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-slate-900">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            className="border-slate-200 text-slate-700"
          >
            Prev
          </Button>

          {pageNumbers.map((num, i) =>
            num === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-sm text-slate-400">…</span>
            ) : (
              <Button
                key={num}
                variant={num === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(num as number)}
                className={
                  num === page
                    ? "bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700"
                }
              >
                {num}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            className="border-slate-200 text-slate-700"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

// Builds page number array with ellipsis markers
// Shows up to 7 items: always shows first, last, current ±2, ellipsis gaps
function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];
  const delta = 2; // pages to show around current
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);

  pages.push(1);
  if (rangeStart > 2) pages.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) pages.push("...");
  pages.push(total);

  return pages;
}
```

### Pattern 4: Skeleton Loading for Paginated Tables

**What:** Show skeleton rows when loading. Existing pages already use `Skeleton` from shadcn/ui. Match this pattern.

**When to use:** During initial load and page change.

The users page currently shows `<LoadingScreen>` during load. With pagination, show a skeleton table matching the existing skeleton pattern used in coordinator/manager pages (N skeleton rows), then replace with real rows.

### Anti-Patterns to Avoid

- **Client-side pagination:** Fetching all rows then slicing in JS. This is what the current users page does. It must be replaced with server-side fetching.
- **Cursor pagination for this use case:** Cursor-based pagination (skip/limit by cursor ID) is better for infinite scroll with live data. Offset pagination (`skip`/`take`) is correct here because: (1) users want to jump to specific pages, (2) data is not a live feed, (3) total count is needed for numbered pages.
- **Resetting page on refreshUsers:** After PATCH operations (edit, deactivate, reactivate), call `refreshUsers` which re-fetches `page` 1. Instead, re-fetch the current page so the user stays on the same page. If the edited user falls off the page after a role change, that's acceptable behaviour.
- **Losing page state on dialog open:** Page/pageSize state should NOT be reset when dialogs (add user, edit user) open or close.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ellipsis page number generation | Custom algorithm | The `buildPageNumbers` function in PaginationControls | Deceptively complex — off-by-one errors, edge cases at total=1, total=2, current=1, current=total |
| Pagination UI component | Page-level duplication | Shared `PaginationControls` component in `components/ui/` | Two tables need pagination; shared component ensures consistency and avoids drift |
| Page state in URL | `useSearchParams` + router push | `useState` only (per CONTEXT.md decision) | User explicitly decided no URL state; adding router push would break the decision |

**Key insight:** The page number button array generation (with ellipsis) has a surprising number of edge cases (1 page, 2 pages, current at very start or end). Build it once in the shared component and test the edge cases there.

---

## Common Pitfalls

### Pitfall 1: Stale Total After Mutation
**What goes wrong:** User adds or deletes a user, then total stays at the old value, causing the last page to show as empty or incorrect.
**Why it happens:** `refreshUsers` re-fetches users for the current page but the `total` from the API is the new total — so if `refreshUsers` re-fetches using the current page/pageSize, the returned `total` will be correct. This is only a bug if `total` is cached separately.
**How to avoid:** Always use the `total` returned from the paginated fetch — never cache it separately between fetches. The `refreshUsers()` call should use the current `page` and `pageSize` to fetch and update both `users` and `total`.
**Warning signs:** Empty last page, or "1–10 of 10" showing when there are 11 users.

### Pitfall 2: Not Resetting Page 1 When Page Size Changes
**What goes wrong:** User is on page 3 (rows 21–30 of 30) and changes page size to 50. The API is called with `page=3&pageSize=50`, which skips 100 rows — returns empty results.
**Why it happens:** `page` state is not reset to 1 when `pageSize` changes.
**How to avoid:** In `handlePageSizeChange`, always call `setPage(1)` before or together with `setPageSize(newSize)`.
**Warning signs:** Empty table after changing page size.

### Pitfall 3: Non-Deterministic Ordering Causing Row Shuffle
**What goes wrong:** Rows shift between pages as user navigates, causing duplicates or missing rows.
**Why it happens:** If `orderBy` uses a non-unique column (e.g. `role`), ties are broken arbitrarily — rows can appear on different pages on successive requests.
**How to avoid:** Always use a stable `orderBy` with a unique tiebreaker (e.g. `orderBy: [{ createdAt: "desc" }, { id: "asc" }]`). The users API already uses `orderBy: { createdAt: "desc" }` — add `{ id: "asc" }` as a tiebreaker.
**Warning signs:** Same user appearing on two pages, or a user missing when browsing sequentially.

### Pitfall 4: Integer Parsing of Query Params Without Validation
**What goes wrong:** `page=0`, `page=-1`, `pageSize=999`, or `page=abc` causes wrong DB queries or errors.
**Why it happens:** `parseInt("abc")` returns `NaN`; `skip = (0 - 1) * 10 = -10` causes a Prisma error.
**How to avoid:** Clamp `page` to `Math.max(1, ...)`. Validate `pageSize` against the allowlist `[10, 25, 50]`. Default to safe values if parsing fails.
**Warning signs:** Prisma error logs with negative skip values; unexpected empty results.

### Pitfall 5: Missing `total` in refreshUsers
**What goes wrong:** After a PATCH (edit/deactivate), `refreshUsers()` only updates the `users` array but not `total`, leaving the count stale.
**Why it happens:** The current `refreshUsers` function fetches `/api/admin/users` without pagination params — once the API changes, this fetch must also use current page/pageSize and extract `total` from the response.
**How to avoid:** Update `refreshUsers` to use the same `page`/`pageSize` state and update both `users` and `total` from the response.
**Warning signs:** "1–10 of 9" counter, incorrect last-page detection.

### Pitfall 6: Coordinator Submissions Page — Optimistic Updates with Pagination
**What goes wrong:** If coordinator submissions are paginated, the current optimistic update for `isSelected` toggle updates the local `submissions` array. With pagination, this array only holds the current page, so the optimistic update works correctly — but `refreshUsers`-style re-fetches must stay on the current page.
**Why it happens:** Pagination reduces the local array to a page slice, not the full dataset.
**How to avoid:** Re-fetch using current page/pageSize after any mutation. The optimistic update pattern already handles local state correctly for the visible page.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Prisma findMany Pattern (admin users)
```typescript
// Source: /app/api/admin/users/route.ts (current — no pagination)
const users = await prisma.user.findMany({
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    emailVerified: true,
    banned: true,
    createdAt: true,
    sessions: {
      select: { updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 1,
    },
    faculty: {
      select: { id: true, name: true },
    },
  },
});
```

Becomes (with pagination):
```typescript
// Source: Pattern — Prisma skip/take offset pagination
const [total, users] = await Promise.all([
  prisma.user.count(),
  prisma.user.findMany({
    skip,
    take: pageSize,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { /* same select as above */ },
  }),
]);
```

### Existing Loading Skeleton Pattern (coordinator submissions — matches existing style)
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx (existing)
{loading && (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full rounded-md" />
    ))}
  </div>
)}
```

Match this pattern for the users page during page transitions — replace `<LoadingScreen>` with skeleton rows.

### Existing Select Pattern (page size selector)
```typescript
// Source: /app/(management)/coordinator/submissions/page.tsx (existing filterStatus Select)
<Select
  value={filterStatus}
  onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
>
  <SelectTrigger className="w-44 border-slate-200 bg-white text-slate-900">
    <SelectValue />
  </SelectTrigger>
  <SelectContent className="border-slate-200 bg-white">
    <SelectItem value="all" className="text-slate-900">All Submissions</SelectItem>
  </SelectContent>
</Select>
```

Match the `border-slate-200 bg-white text-slate-900` class pattern for all new Select elements in PaginationControls.

---

## API Query Parameter Naming Decision

The CONTEXT.md leaves naming to Claude's discretion ("match existing patterns"). The existing API has no paginated endpoints to match against. Two candidates:

| Option | Params | Prisma mapping |
|--------|--------|----------------|
| `page`/`pageSize` | `?page=2&pageSize=25` | `skip = (page-1)*pageSize`, `take = pageSize` |
| `skip`/`take` | `?skip=10&take=25` | Direct pass-through |

**Recommendation: Use `page`/`pageSize`.** Rationale: (1) page numbers are what the UI works in — the component tracks `page` not `skip`; (2) `page`/`pageSize` is more self-documenting for API consumers; (3) `skip`/`take` leaks the Prisma implementation detail. The `skip` is derived server-side from `page` and `pageSize`.

---

## Placement of Controls

Claude's discretion per CONTEXT.md. Recommendation based on UX best practice:

**Users table:** Controls **below** the table. Users scan the table first, then navigate to the next page. Having the page size selector also below keeps both controls together and avoids the header section becoming too busy (it already has the "Add User" button).

**Coordinator submissions table:** Controls **below** the table. The table already has filter/sort selects above it — adding pagination controls above would create a crowded toolbar.

If either table can have very few rows (empty state), the pagination controls should be hidden when `total <= pageSize` (no pagination needed) to avoid showing "1 of 1" controls with a single page.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side pagination (slice in JS) | Server-side offset pagination (`skip`/`take`) | Standard practice for tables > 50 rows | Eliminates loading all rows; DB does the work |
| Cursor-based pagination | Offset pagination | Cursor is better for infinite scroll | Offset is correct for numbered pages with jump-to capability |
| External pagination library (react-paginate) | Hand-built from shadcn/ui primitives | Modern shadcn/ui ecosystem | No library needed; full control over styling; matches existing component style |

**Deprecated/outdated:**
- Fetching all rows from `findMany()` without `take`: Current pattern in users API — must be replaced for UX-01.

---

## Open Questions

1. **Should coordinator submissions be paginated?**
   - What we know: The coordinator table is scoped to active academic year + one faculty. At a university with ~50 students/faculty and one academic year, this rarely hits 50+ rows. But at a larger institution, a faculty could have 100+ students all submitting.
   - What's unclear: The actual data volume in production.
   - Recommendation: Apply the criterion literally — "if the table can realistically grow to 50+ rows". Since the context does not specify institution size, **include coordinator submissions in the plan** as a conservative choice. The implementation cost is low (same pattern).

2. **Should PATCH (edit/deactivate/reactivate) operations stay on the current page after refresh?**
   - What we know: The current `refreshUsers()` re-fetches all users and replaces `users` state. With pagination, it should re-fetch the current page.
   - What's unclear: Whether an edit could cause a user to move to a different page (if `orderBy` changes their position — but `orderBy: createdAt` is immutable, so position is stable).
   - Recommendation: Re-fetch current page after PATCH. Position is stable because `createdAt` does not change on edit.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `/app/api/admin/users/route.ts`, `/app/(management)/users/page.tsx`, all other page.tsx files, `prisma/schema.prisma`
- Prisma offset pagination docs: https://www.prisma.io/docs/orm/prisma-client/queries/pagination (offset-based pagination uses `skip` + `take` — verified pattern)
- Next.js 16 `NextRequest` searchParams API: accessed via `new URL(req.url).searchParams` (standard Web API available in all Next.js route handlers)

### Secondary (MEDIUM confidence)
- Project codebase pattern analysis: existing Select, Skeleton, Button usage observed directly from source files — styling conventions extracted

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all from existing dependencies
- Architecture: HIGH — direct inspection of all table pages in the codebase; pattern is standard Prisma offset pagination
- Pitfalls: HIGH — all pitfalls derived from codebase analysis (existing patterns reveal what will break), not speculation
- Table selection (UX-02): MEDIUM — based on domain analysis of what's "realistically 50+ rows"; production data volume not known

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack — no volatile dependencies)
