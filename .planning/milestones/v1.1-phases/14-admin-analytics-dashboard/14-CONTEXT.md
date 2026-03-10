# Phase 14 Context: Admin Analytics Dashboard

**Created:** 2026-03-09
**Phase goal:** Administrators can see platform usage patterns through charts showing active users and browser breakdown

## Prior Decisions (locked)

- Analytics derived from existing session data — no separate page view tracking (ANALYTICS-04)
- Active user counts from session table (distinct userId) — no new model (Pitfall 9)
- Browser usage parsed from session `userAgent` using ua-parser-js (Pitfall 10)
- Charts rendered with Recharts (ANALYTICS-03)
- Two new runtime packages: recharts, ua-parser-js
- Group unknown/rare browsers under "Other" (Pitfall 10)
- Filter out bot traffic before counting browsers

## Area 1: Dashboard Page Placement

### Decisions

- **Route:** Dedicated page at `/admin/analytics` — separate from existing admin dashboard
- **Sidebar:** "Usage Stats" with Activity icon, placed after Audit Log in admin nav
- **Access:** Admin + Marketing Manager can both view analytics
- **Layout:** Stacked vertically — active users chart on top (full width), browser breakdown below (full width)

### Code Context

- Page at `app/(portal)/admin/analytics/page.tsx` — client component with Recharts
- API at `app/api/admin/analytics/route.ts` — returns both active users and browser data
- Sidebar: Add entry to both `ADMINISTRATOR` and `MARKETING_MANAGER` cases in `buildPages()` at `components/app-sidebar.tsx`
- Access: Use `requireRole(["ADMINISTRATOR", "MARKETING_MANAGER"])` in API

## Area 2: Chart Types and Data Presentation

### Decisions

- **Active users:** Stat cards for 7d/30d totals at top, PLUS a daily trend area chart below showing daily active users over the selected period
- **Browser breakdown:** Pie/donut chart showing browser share proportions
- **Time period toggle:** Yes — toggle between "Last 7 days" and "Last 30 days" views on the active users chart
- **Rare browsers:** Group anything below 5% into "Other" — keeps chart clean

### Code Context

- Recharts components: `AreaChart`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` for trend chart
- Recharts components: `PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend` for browser donut
- Toggle: Simple button group or tabs for 7d/30d switching
- API returns daily breakdown array + totals for both periods

## Area 3: Active Users Metric Definition

### Decisions

- **Active definition:** Any user with a session `updatedAt` within the period — captures users actively using the system (Better Auth updates `updatedAt` on session activity)
- **Daily trend:** Cumulative over the period — always goes up, shows growth of distinct active users
- **Banned users:** Excluded from active counts — filter by joining User table where `banned != true`
- **Browser breakdown scope:** All sessions ever — gives broader picture of browser usage, not filtered by time period

### Code Context

- Active users query: `SELECT DISTINCT "userId" FROM session WHERE "updated_at" >= $period AND "userId" NOT IN (SELECT id FROM user WHERE banned = true)`
- Daily cumulative: For each day, count distinct users with `updatedAt` up to that day within the period
- Browser query: `SELECT "user_agent" FROM session WHERE "user_agent" IS NOT NULL` — parse all with ua-parser-js, group by browser name, aggregate counts
- 5% threshold applied after aggregation: browsers below 5% of total → "Other"

## Deferred Ideas

None captured.

---
*Context created: 2026-03-09*
*Ready for: /gsd:plan-phase 14*
