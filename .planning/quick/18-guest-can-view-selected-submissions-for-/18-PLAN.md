---
phase: quick-18
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/guest/submissions/route.ts
  - app/(guest)/guest/page.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Guest can see a year selector showing all academic years that have selected submissions for their faculty"
    - "Guest can switch between years and see that year's selected submissions"
    - "Mini-dashboard stats update to reflect the selected year"
    - "Default view shows the active year's submissions on first load"
  artifacts:
    - path: "app/api/guest/submissions/route.ts"
      provides: "Year-filtered guest submissions with available years list"
      contains: "yearId"
    - path: "app/(guest)/guest/page.tsx"
      provides: "Year selector dropdown and year-aware data fetching"
      contains: "selectedYearId"
  key_links:
    - from: "app/(guest)/guest/page.tsx"
      to: "/api/guest/submissions"
      via: "fetch with yearId query param"
      pattern: "yearId"
---

<objective>
Add academic year selector to the guest magazine page so guests can view selected submissions from any year that has published articles for their faculty.

Purpose: Currently the guest API returns all selected submissions without year filtering, and the UI has no way to browse submissions by academic year. Guests need to see each year's selected work independently.

Output: Updated API with yearId param and availableYears response field; updated guest page with Select dropdown and year-aware fetching.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/api/guest/submissions/route.ts
@app/(guest)/guest/page.tsx
@app/(portal)/reports/page.tsx (year selector pattern reference)
@prisma/schema.prisma (AcademicYear and Submission models)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add yearId param and availableYears to guest submissions API</name>
  <files>app/api/guest/submissions/route.ts</files>
  <action>
Modify the GET handler to:

1. Accept optional `yearId` query param from the URL search params. Import `NextRequest` and change the function signature to `GET(request: NextRequest)`. Extract yearId via `request.nextUrl.searchParams.get("yearId")`.

2. In the existing Promise.all, replace the single `activeYear` query with TWO queries:
   - `availableYears`: Find all distinct academic years that have at least one selected submission for this guest's faculty. Use:
     ```
     prisma.academicYear.findMany({
       where: {
         submissions: {
           some: {
             isSelected: true,
             facultyId: guestFacultyId,
           },
         },
       },
       select: { id: true, yearLabel: true, isActive: true },
       orderBy: { createdAt: "desc" },
     })
     ```
   - Keep the `faculty` query as-is.

3. After Promise.all resolves, determine the effective `targetYearId`:
   - If `yearId` param provided AND exists in `availableYears` array, use it.
   - Otherwise, find the year with `isActive: true` from `availableYears`. If none active, use the first available year. If no available years at all, set to null.

4. Move the `submissions` findMany AFTER the Promise.all (it now depends on `targetYearId`). Add `academicYearId: targetYearId` to the where clause alongside `isSelected: true` and `facultyId: guestFacultyId`. If `targetYearId` is null, return empty submissions array without querying.

5. Update the JSON response to include:
   ```json
   {
     "submissions": result,
     "facultyName": faculty?.name ?? "Unknown Faculty",
     "academicYearLabel": selectedYear?.yearLabel ?? null,
     "availableYears": availableYears,
     "selectedYearId": targetYearId
   }
   ```
   Where `selectedYear` is `availableYears.find(y => y.id === targetYearId)`.
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>curl the API endpoint in browser dev tools and confirm availableYears array and yearId filtering work</manual>
  </verify>
  <done>API accepts optional yearId param, returns availableYears array with {id, yearLabel, isActive}, defaults to active year, filters submissions by selected year</done>
</task>

<task type="auto">
  <name>Task 2: Add year selector dropdown to guest page with year-aware fetching</name>
  <files>app/(guest)/guest/page.tsx</files>
  <action>
1. Add imports for Select components from `@/components/ui/select`:
   `Select, SelectContent, SelectItem, SelectTrigger, SelectValue`

2. Add new state variables:
   ```tsx
   const [availableYears, setAvailableYears] = useState<{ id: string; yearLabel: string; isActive: boolean }[]>([]);
   const [selectedYearId, setSelectedYearId] = useState<string>("");
   ```

3. Update the fetch URL in useEffect to include yearId when set:
   ```tsx
   const url = selectedYearId
     ? `/api/guest/submissions?yearId=${selectedYearId}`
     : "/api/guest/submissions";
   const res = await fetch(url);
   ```

4. Update the response type to include `availableYears` and `selectedYearId`. After parsing the response, set:
   ```tsx
   setAvailableYears(data.availableYears ?? []);
   if (!selectedYearId && data.selectedYearId) {
     setSelectedYearId(data.selectedYearId);
   }
   ```

5. Add `selectedYearId` to the useEffect dependency array so switching years triggers a re-fetch. Use a `useRef` flag (`initialLoadDone`) to prevent the double-fetch on mount: on the first load, the effect runs with empty selectedYearId (API defaults to active year), then sets selectedYearId from the response. The ref prevents the second fetch from firing when selectedYearId gets set on mount. After mount, subsequent selectedYearId changes should trigger re-fetch.

   Pattern:
   ```tsx
   const initialLoadDone = useRef(false);

   useEffect(() => {
     // Skip re-fetch when selectedYearId is set from initial load response
     if (initialLoadDone.current && !selectedYearId) return;

     // ... fetch logic ...
     // In the response handler, after setting selectedYearId:
     if (!initialLoadDone.current) {
       initialLoadDone.current = true;
     }
   }, [selectedYearId]);
   ```

6. Add the year selector in the hero section, between the faculty name and the article count. Place it inside the `flex flex-wrap items-center gap-3` div, replacing the static Badge. Only render when `availableYears.length > 1` (no point showing selector with one year):
   ```tsx
   {availableYears.length > 1 ? (
     <Select value={selectedYearId} onValueChange={setSelectedYearId}>
       <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white hover:bg-white/20">
         <SelectValue placeholder="Select year" />
       </SelectTrigger>
       <SelectContent>
         {availableYears.map((year) => (
           <SelectItem key={year.id} value={year.id}>
             {year.yearLabel}
           </SelectItem>
         ))}
       </SelectContent>
     </Select>
   ) : academicYearLabel ? (
     <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 hover:bg-amber-400/30">
       {academicYearLabel}
     </Badge>
   ) : null}
   ```

7. Update the "Academic Year" stat card to show the selected year's label instead of just the academicYearLabel. Also update the subtitle from "Current active year" to "Selected year":
   ```tsx
   <CardContent className="text-3xl font-semibold">
     {academicYearLabel ?? "—"}
   </CardContent>
   ```
   (academicYearLabel already comes from the API response reflecting the selected year, so no change needed to the value -- just update the subtitle text to "Selected year" instead of "Current active year".)

8. Show a subtle loading indicator when switching years: while loading is true and availableYears is already populated (i.e., not initial load), show a simple opacity transition or skeleton overlay on the articles grid. Use a derived `isRefetching` boolean: `const isRefetching = loading && availableYears.length > 0;`. When `isRefetching` is true, don't show the full page skeleton -- instead keep the current layout visible with `opacity-50 pointer-events-none` on the articles grid section.
  </action>
  <verify>
    <automated>npx tsc --noEmit --pretty 2>&1 | head -30</automated>
    <manual>Visit the guest page, verify year selector appears when multiple years have selected submissions, switch years and confirm articles and stats update</manual>
  </verify>
  <done>Guest page shows year selector dropdown when multiple years available, switching years re-fetches and updates submissions grid and stat cards, default is active year, single-year view shows badge as before</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Guest page loads with active year submissions by default
- Year selector dropdown appears when multiple years have selected submissions
- Switching years updates the article grid, hero badge/selector, and stat cards
- If only one year has selected submissions, the static badge is shown (no dropdown)
- If no years have selected submissions, empty state renders correctly
</verification>

<success_criteria>
Guest can browse selected submissions by academic year using a dropdown selector. Stats and article grid update per selected year. Active year is the default.
</success_criteria>

<output>
After completion, create `.planning/quick/18-guest-can-view-selected-submissions-for-/18-SUMMARY.md`
</output>
