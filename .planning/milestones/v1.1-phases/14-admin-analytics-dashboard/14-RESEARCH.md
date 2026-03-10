# Phase 14: Admin Analytics Dashboard - Research

**Researched:** 2026-03-09
**Domain:** Recharts charting, ua-parser-js user-agent parsing, Prisma session aggregation
**Confidence:** HIGH

## Summary

Phase 14 adds an analytics dashboard at `/admin/analytics` showing active user counts (7d/30d) with an area chart trend and a browser usage donut chart. All data derives from the existing `Session` model -- no new models or tracking infrastructure needed. Two new runtime packages are required: `recharts` (v3.x) for charting and `ua-parser-js` (v2.x) for user-agent parsing.

The project already has well-established patterns for admin pages (audit-log, users), API routes with `requireRole`, and client-side data fetching with `useEffect`/`fetch`. This phase follows those patterns exactly, with the main addition being Recharts client components (requiring `"use client"` directive since Recharts uses browser SVG APIs).

**Primary recommendation:** Build a single API endpoint returning both active users and browser data, and a single client page component with Recharts charts. Follow the audit-log page pattern for structure and auth gating.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Analytics derived from existing session data -- no separate page view tracking (ANALYTICS-04)
- Active user counts from session table (distinct userId) -- no new model (Pitfall 9)
- Browser usage parsed from session `userAgent` using ua-parser-js (Pitfall 10)
- Charts rendered with Recharts (ANALYTICS-03)
- Two new runtime packages: recharts, ua-parser-js
- Group unknown/rare browsers under "Other" (Pitfall 10)
- Filter out bot traffic before counting browsers
- Route: Dedicated page at `/admin/analytics` -- separate from existing admin dashboard
- Sidebar: "Usage Stats" with Activity icon, placed after Audit Log in admin nav
- Access: Admin + Marketing Manager can both view analytics
- Layout: Stacked vertically -- active users chart on top (full width), browser breakdown below (full width)
- Active users: Stat cards for 7d/30d totals at top, PLUS a daily trend area chart below showing daily active users over the selected period
- Browser breakdown: Pie/donut chart showing browser share proportions
- Time period toggle: Toggle between "Last 7 days" and "Last 30 days" views on the active users chart
- Rare browsers: Group anything below 5% into "Other"
- Active definition: Any user with session `updatedAt` within the period
- Banned users: Excluded from active counts
- Browser breakdown scope: All sessions ever
- Daily trend: Cumulative over the period

### Claude's Discretion
None explicitly listed -- all areas have locked decisions.

### Deferred Ideas (OUT OF SCOPE)
None captured.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANALYTICS-01 | Admin can view active user counts for the last 7 and 30 days | Session `updatedAt` query with distinct userId, excluding banned users. Stat cards + AreaChart trend. |
| ANALYTICS-02 | Admin can view browser usage breakdown parsed from session user-agent data | ua-parser-js v2 `getBrowser()` on all session userAgent values, grouped by name, 5% threshold for "Other", bot filtering via `isBot()`. PieChart donut. |
| ANALYTICS-03 | Analytics dashboard displays data using charts (Recharts) | Recharts v3.x -- AreaChart for trend, PieChart for browser breakdown. Must use `"use client"` directive. |
| ANALYTICS-04 | Analytics is derived from existing session data (no separate page view tracking) | All queries hit existing Session model. No new models, no page view tracking. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.0 | React charting (AreaChart, PieChart) | Most popular React chart library, composable components, built on D3. Works with React 19. |
| ua-parser-js | ^2.0.9 | Parse user-agent strings for browser name | Most comprehensive UA parsing library. v2 adds `isBot()` helper for bot filtering. |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @prisma/client | ^7.3.0 | Database queries for session aggregation | All data fetching |
| date-fns | ^3.6.0 | Date formatting for chart labels | XAxis tick formatting |
| lucide-react | ^0.563.0 | Activity icon for sidebar | Sidebar nav item |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | chart.js/react-chartjs-2 | Recharts is locked decision; more React-native composability |
| ua-parser-js | bowser | ua-parser-js is locked decision; has built-in bot detection in v2 |

**Installation:**
```bash
npm install recharts ua-parser-js
npm install -D @types/ua-parser-js
```

Note: `@types/ua-parser-js` may not be needed if ua-parser-js v2 ships its own types. Check after install. Recharts v3 includes TypeScript types.

## Architecture Patterns

### Recommended Project Structure
```
app/
├── (portal)/admin/analytics/
│   └── page.tsx              # Client component with Recharts charts
├── api/admin/analytics/
│   └── route.ts              # Single API endpoint returning all analytics data
components/
└── app-sidebar.tsx           # Add "Usage Stats" nav entry
```

### Pattern 1: Single API Endpoint
**What:** One GET endpoint at `/api/admin/analytics` returns both active user data and browser breakdown in a single response.
**When to use:** When the dashboard loads all data at once (no lazy loading of individual charts).
**Why:** Simpler client code, single fetch call, avoids waterfall requests. The data is lightweight (max 30 daily data points + ~10 browser entries).

```typescript
// API response shape
{
  activeUsers: {
    total7d: number;
    total30d: number;
    daily: { date: string; count: number }[];
  },
  browsers: {
    name: string;
    count: number;
    percentage: number;
  }[]
}
```

### Pattern 2: Client Page with useEffect/fetch (project standard)
**What:** Client component fetches from API on mount, manages loading/error state with useState.
**When to use:** All admin pages in this project use this pattern (audit-log, users, guests).
**Example from audit-log page:**
```typescript
"use client";
// useState for data, loading, error
// useEffect to fetch on mount
// useSession() for auth check
// useRouter() for redirect if unauthorized
```

### Pattern 3: Recharts Client Component
**What:** Recharts requires `"use client"` because it renders SVG in the browser. Wrap charts in `ResponsiveContainer` for responsive sizing.
**Key v3 notes:**
- Z-index determined by JSX render order (put Tooltip before Legend)
- `blendStroke` removed from Pie -- use `stroke="none"` instead
- Works with React 19 (confirmed; earlier issue was Preact-specific)

### Anti-Patterns to Avoid
- **Server Component with Recharts:** Recharts must be in a client component. Do not try to render charts in a server component.
- **Multiple API calls for one page:** Do not create separate endpoints for active users and browser data. One endpoint, one fetch.
- **Raw SQL for simple queries:** Use Prisma's query builder. The queries are straightforward (groupBy, distinct, where clauses).
- **Parsing user-agents on the client:** Parse on the server in the API route. Send aggregated results to the client.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User-agent parsing | Regex-based browser detection | ua-parser-js `getBrowser()` | Thousands of UA string variations, constantly changing |
| Bot detection | String matching for known bots | ua-parser-js `isBot()` helper | Comprehensive bot database maintained by library |
| Chart rendering | Custom SVG or canvas charts | Recharts components | Tooltips, responsive sizing, animations, accessibility |
| Browser name normalization | Manual mapping of browser names | ua-parser-js normalizes names | Handles edge cases (Chrome Mobile vs Chrome, etc.) |

**Key insight:** User-agent parsing is deceptively complex. There are thousands of variations and new browsers/bots appear regularly. Always use a maintained library.

## Common Pitfalls

### Pitfall 1: Recharts Not Rendering (Missing ResponsiveContainer Height)
**What goes wrong:** Charts render as 0x0 pixels -- invisible on the page.
**Why it happens:** `ResponsiveContainer` needs an explicit height (or a parent with explicit height). Width defaults to 100% but height does not.
**How to avoid:** Always set `height` on ResponsiveContainer: `<ResponsiveContainer width="100%" height={300}>`.
**Warning signs:** Chart component mounts but nothing visible in DOM.

### Pitfall 2: ua-parser-js v2 Import Path
**What goes wrong:** Import errors or missing `isBot` function.
**Why it happens:** v2 restructured imports. `isBot` is in `ua-parser-js/helpers`, not the main export.
**How to avoid:** Use correct imports:
```typescript
import UAParser from 'ua-parser-js';
import { isBot } from 'ua-parser-js/helpers';
```
**Warning signs:** `isBot is not a function` or `Cannot find module` errors.

### Pitfall 3: Null userAgent Values
**What goes wrong:** `getBrowser()` throws or returns undefined when userAgent is null.
**Why it happens:** Session model has `userAgent String?` -- it can be null.
**How to avoid:** Filter out null userAgent values before parsing: `WHERE "user_agent" IS NOT NULL`.
**Warning signs:** Runtime errors in API route.

### Pitfall 4: Cumulative Count Query Performance
**What goes wrong:** N+1 queries when computing daily cumulative counts (one query per day).
**Why it happens:** Naive implementation runs a separate COUNT for each day in the range.
**How to avoid:** Fetch all sessions in the period once, then compute cumulative counts in JS. Or use a single query with date grouping and accumulate in code.
**Warning signs:** Slow API response, multiple database round trips.

### Pitfall 5: Timezone Issues with Daily Grouping
**What goes wrong:** Daily counts shift by a day depending on server timezone.
**Why it happens:** `updatedAt` is stored as UTC timestamps. Grouping by date without timezone awareness gives wrong day boundaries.
**How to avoid:** Use UTC consistently. Format dates as `YYYY-MM-DD` in UTC. The chart labels should show dates without time.
**Warning signs:** Daily counts don't match expected values, off-by-one day errors.

### Pitfall 6: PieChart Label Overflow
**What goes wrong:** Pie chart labels overlap or get cut off.
**Why it happens:** Default label positioning doesn't account for long browser names.
**How to avoid:** Use `Legend` component instead of inline labels on the Pie, or use a custom label renderer with proper positioning.
**Warning signs:** Overlapping text on the donut chart.

## Code Examples

### API Route Structure
```typescript
// app/api/admin/analytics/route.ts
import { requireRole } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import UAParser from "ua-parser-js";
import { isBot } from "ua-parser-js/helpers";
import { NextResponse } from "next/server";

export async function GET() {
  const { authorized, error } = await requireRole([
    "ADMINISTRATOR",
    "MARKETING_MANAGER",
  ]);
  if (!authorized) {
    return NextResponse.json(
      { error: error ?? "Unauthorized" },
      { status: 403 }
    );
  }

  // Active users: distinct userId with updatedAt in period, excluding banned
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch sessions for 30d (superset of 7d)
  const sessions = await prisma.session.findMany({
    where: {
      updatedAt: { gte: thirtyDaysAgo },
      user: { banned: { not: true } },
    },
    select: { userId: true, updatedAt: true },
  });

  // Compute totals and daily breakdown
  const uniqueUsers7d = new Set(
    sessions.filter(s => s.updatedAt >= sevenDaysAgo).map(s => s.userId)
  );
  const uniqueUsers30d = new Set(sessions.map(s => s.userId));

  // Daily cumulative: for each day, count distinct users up to that day
  // ... (build daily array)

  // Browser breakdown: all sessions with userAgent
  const allSessions = await prisma.session.findMany({
    where: { userAgent: { not: null } },
    select: { userAgent: true },
  });

  const browserCounts: Record<string, number> = {};
  for (const s of allSessions) {
    if (!s.userAgent || isBot(s.userAgent)) continue;
    const parser = new UAParser(s.userAgent);
    const browser = parser.getBrowser();
    const name = browser.name || "Unknown";
    browserCounts[name] = (browserCounts[name] || 0) + 1;
  }

  // Apply 5% threshold
  const total = Object.values(browserCounts).reduce((a, b) => a + b, 0);
  const threshold = total * 0.05;
  const browsers: { name: string; count: number }[] = [];
  let otherCount = 0;
  for (const [name, count] of Object.entries(browserCounts)) {
    if (count < threshold) {
      otherCount += count;
    } else {
      browsers.push({ name, count });
    }
  }
  if (otherCount > 0) {
    browsers.push({ name: "Other", count: otherCount });
  }

  return NextResponse.json({
    activeUsers: {
      total7d: uniqueUsers7d.size,
      total30d: uniqueUsers30d.size,
      daily: [], // filled with cumulative daily data
    },
    browsers: browsers.map(b => ({
      ...b,
      percentage: Math.round((b.count / total) * 100),
    })),
  });
}
```

### Recharts AreaChart (Active Users Trend)
```typescript
"use client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// data: { date: string; count: number }[]
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Area
      type="monotone"
      dataKey="count"
      stroke="#0f172a"
      fill="#0f172a"
      fillOpacity={0.1}
    />
  </AreaChart>
</ResponsiveContainer>
```

### Recharts PieChart (Browser Donut)
```typescript
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#0f172a", "#fbbf24", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#6b7280"];

// data: { name: string; count: number; percentage: number }[]
<ResponsiveContainer width="100%" height={350}>
  <PieChart>
    <Pie
      data={data}
      dataKey="count"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={60}
      outerRadius={120}
      stroke="none"
    >
      {data.map((entry, index) => (
        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip />
    <Legend />
  </PieChart>
</ResponsiveContainer>
```

### Sidebar Addition Pattern
```typescript
// In buildPages() for ADMINISTRATOR case, add after Audit Log:
{ title: "Usage Stats", url: "/admin/analytics", icon: Activity }

// For MARKETING_MANAGER case, add:
{ title: "Usage Stats", url: "/admin/analytics", icon: Activity }

// Import Activity from lucide-react at the top
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| recharts v2 (react-smooth animations) | recharts v3 (built-in animations) | 2024 | No more react-smooth peer dep |
| ua-parser-js v1 (no bot detection) | ua-parser-js v2 (isBot helper) | 2024 | Built-in bot filtering |
| recharts blendStroke on Pie | stroke="none" on Pie | recharts v3 | blendStroke prop removed |

**Deprecated/outdated:**
- `recharts-scale` package: now internal to recharts v3
- `react-smooth` package: now internal to recharts v3
- ua-parser-js v1 API: v2 restructured helpers into submodule imports

## Open Questions

1. **ua-parser-js v2 TypeScript types**
   - What we know: v2 likely ships its own types. The `@types/ua-parser-js` package may be for v1 only.
   - What's unclear: Whether `@types/ua-parser-js` is compatible with v2 or if v2 is self-typed.
   - Recommendation: Install `ua-parser-js` first, check if types resolve. Only install `@types/ua-parser-js` if needed.

2. **Session data volume**
   - What we know: Browser breakdown queries ALL sessions ever (per CONTEXT.md decision).
   - What's unclear: How many sessions exist in production -- could be performance concern for large datasets.
   - Recommendation: For this university system, session volume is likely manageable. If performance becomes an issue, add pagination or caching later (out of scope for v1.1).

## Sources

### Primary (HIGH confidence)
- [recharts npm](https://www.npmjs.com/package/recharts) - v3.8.0 latest, React 19 compatible
- [recharts v3 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) - breaking changes documented
- [ua-parser-js npm](https://www.npmjs.com/package/ua-parser-js) - v2.0.9 latest
- [ua-parser-js getBrowser docs](https://docs.uaparser.dev/api/main/get-browser.html) - API reference
- [ua-parser-js isBot docs](https://docs.uaparser.dev/api/submodules/helpers/is-bot.html) - Bot detection helper

### Secondary (MEDIUM confidence)
- [recharts React 19 issue #6857](https://github.com/recharts/recharts/issues/6857) - Confirmed Preact-specific, not React 19 issue
- [Next.js Recharts integration guides](https://app-generator.dev/docs/technologies/nextjs/integrate-recharts.html) - "use client" requirement confirmed

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions verified via npm, React 19 compatibility confirmed
- Architecture: HIGH - Following established project patterns (audit-log page as template)
- Pitfalls: HIGH - Recharts ResponsiveContainer height issue is well-documented; ua-parser-js v2 import paths verified in official docs

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (stable libraries, 30-day validity)
