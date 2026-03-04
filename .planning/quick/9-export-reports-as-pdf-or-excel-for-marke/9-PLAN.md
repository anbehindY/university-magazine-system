---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/export-report.ts
  - app/(portal)/reports/page.tsx
  - package.json
autonomous: true
requirements: [QUICK-9]

must_haves:
  truths:
    - "User can export statistics table as Excel (.xlsx) from the Statistics tab"
    - "User can export statistics table as PDF from the Statistics tab"
    - "User can export exceptions table as Excel (.xlsx) from the Exceptions tab"
    - "User can export exceptions table as PDF from the Exceptions tab"
    - "Exported files include academic year label in filename"
    - "Export buttons are only visible when data is loaded (not during loading/error/empty states)"
  artifacts:
    - path: "lib/export-report.ts"
      provides: "Client-side export utility functions"
      exports: ["exportToExcel", "exportToPdf"]
    - path: "app/(portal)/reports/page.tsx"
      provides: "Reports page with export dropdown buttons"
      contains: "exportToExcel"
  key_links:
    - from: "app/(portal)/reports/page.tsx"
      to: "lib/export-report.ts"
      via: "import { exportToExcel, exportToPdf }"
      pattern: "import.*exportTo(Excel|Pdf).*from.*export-report"
---

<objective>
Add client-side PDF and Excel export to the reports page, allowing Marketing Managers and Coordinators to download statistics and exceptions tables as shareable files.

Purpose: Enable external data sharing without requiring access to the application.
Output: Export utility module + export dropdown buttons on both report tabs.
</objective>

<execution_context>
@/home/alfie/.claude/get-shit-done/workflows/execute-plan.md
@/home/alfie/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/(portal)/reports/page.tsx
@components/ui/dropdown-menu.tsx
@components/ui/button.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install dependencies and create export utility</name>
  <files>lib/export-report.ts, package.json</files>
  <action>
    1. Install dependencies: `npm install xlsx jspdf jspdf-autotable`
    2. Install type definitions: `npm install -D @types/jspdf` (only if needed; check if jspdf ships its own types first — it likely does, so skip if so)
    3. Create `lib/export-report.ts` with two exported functions:

    ```typescript
    exportToExcel(sheetName: string, headers: string[], rows: (string | number)[][], filename: string): void
    ```
    - Use `xlsx` (import * as XLSX from "xlsx")
    - Create a workbook with one worksheet
    - First row = headers, subsequent rows = data
    - Use `XLSX.writeFile(wb, filename)` to trigger browser download
    - Filename should end with `.xlsx`

    ```typescript
    exportToPdf(title: string, headers: string[], rows: (string | number)[][], filename: string): void
    ```
    - Use `jspdf` and `jspdf-autotable`
    - Import: `import jsPDF from "jspdf"` and `import autoTable from "jspdf-autotable"`
    - Create landscape A4 PDF
    - Add title text at top (16pt, bold)
    - Add generated date below title (10pt, gray)
    - Use `autoTable` to render table with headers and rows, starting below the title
    - Use `doc.save(filename)` to trigger download
    - Filename should end with `.pdf`

    Both functions are client-side only ("use client" is not needed since this is a plain .ts util imported by a client component). Neither function is async — they operate synchronously on in-memory data.
  </action>
  <verify>
    <automated>npx tsc --noEmit lib/export-report.ts 2>&1 | head -20</automated>
    <manual>Verify the file exports both functions with correct signatures</manual>
  </verify>
  <done>lib/export-report.ts exists, exports exportToExcel and exportToPdf, TypeScript compiles without errors</done>
</task>

<task type="auto">
  <name>Task 2: Add export dropdown buttons to reports page</name>
  <files>app/(portal)/reports/page.tsx</files>
  <action>
    1. Add imports to the reports page:
       - `import { exportToExcel, exportToPdf } from "@/lib/export-report";`
       - `import { Button } from "@/components/ui/button";`
       - Import DropdownMenu components: `DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem` from `"@/components/ui/dropdown-menu"`
       - `Download` icon is already imported from lucide-react
       - Also import `FileSpreadsheet` from lucide-react for Excel icon distinction

    2. Create a helper function inside the component to get the year label for filenames:
       ```typescript
       const yearLabel = allYears.find((y) => y.id === selectedYearId)?.yearLabel ?? "report";
       ```

    3. Add export dropdown to the **Statistics tab** — place it in the multi-faculty view (the `<>` fragment that renders when `statsData.length > 1`), right above the summary cards. Add a flex row with a heading and the export button aligned right:
       ```tsx
       <div className="flex items-center justify-between">
         <h2 className="text-lg font-semibold text-slate-900">Faculty Statistics</h2>
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="outline" size="sm">
               <Download className="h-4 w-4" />
               Export
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={() => exportToExcel(
               "Statistics",
               ["Faculty Name", "Submissions", "% of Total", "Contributors"],
               sortedStats.map(r => [r.facultyName ?? "Unknown", r.submissionCount, r.percentageOfTotal.toFixed(1) + "%", r.distinctContributors]),
               `Statistics_${yearLabel}.xlsx`
             )}>
               <FileSpreadsheet className="h-4 w-4" />
               Export as Excel
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => exportToPdf(
               `Faculty Statistics — ${yearLabel}`,
               ["Faculty Name", "Submissions", "% of Total", "Contributors"],
               sortedStats.map(r => [r.facultyName ?? "Unknown", r.submissionCount, r.percentageOfTotal.toFixed(1) + "%", r.distinctContributors]),
               `Statistics_${yearLabel}.pdf`
             )}>
               <FileText className="h-4 w-4" />
               Export as PDF
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       </div>
       ```

    4. For the **single-faculty view** (when `statsData.length === 1`), also add an export dropdown after the faculty name heading, using the same pattern but with only one row of data.

    5. Add export dropdown to the **Exceptions tab** — place it in the row that contains the overdue toggle buttons (the `<div className="flex flex-wrap items-center gap-2">` section). Add the export button at the end of that flex row (use `ml-auto` to push it right). Only render when `!exceptionsLoading && !exceptionsError && exceptionsData.length > 0`:
       ```tsx
       {!exceptionsLoading && !exceptionsError && exceptionsData.length > 0 && (
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="outline" size="sm" className="ml-auto">
               <Download className="h-4 w-4" />
               Export
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={() => exportToExcel(
               "Exceptions",
               ["Student Name", "Title", "Faculty", "Submitted Date", "Waiting Days"],
               exceptionsData
                 .sort((a, b) => (b.daysSinceSubmission ?? 0) - (a.daysSinceSubmission ?? 0))
                 .map(r => [r.studentName ?? "Unknown", r.title ?? "Untitled", r.facultyName ?? "Unknown", r.submittedAt ? formatDate(r.submittedAt) : "-", r.daysSinceSubmission ?? 0]),
               `Exceptions_${yearLabel}.xlsx`
             )}>
               <FileSpreadsheet className="h-4 w-4" />
               Export as Excel
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => exportToPdf(
               `Exceptions Report — ${yearLabel}`,
               ["Student Name", "Title", "Faculty", "Submitted Date", "Waiting Days"],
               exceptionsData
                 .sort((a, b) => (b.daysSinceSubmission ?? 0) - (a.daysSinceSubmission ?? 0))
                 .map(r => [r.studentName ?? "Unknown", r.title ?? "Untitled", r.facultyName ?? "Unknown", r.submittedAt ? formatDate(r.submittedAt) : "-", r.daysSinceSubmission ?? 0]),
               `Exceptions_${yearLabel}.pdf`
             )}>
               <FileText className="h-4 w-4" />
               Export as PDF
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       )}
       ```

    6. Ensure the export buttons match project styling: `variant="outline"`, `size="sm"`, slate color scheme consistent with the page.
  </action>
  <verify>
    <automated>cd /home/alfie/next-prisma && npx next build 2>&1 | tail -5</automated>
    <manual>Visit /reports, load statistics tab, click Export dropdown, verify Excel and PDF options appear. Download each format and verify file contents match the table data.</manual>
  </verify>
  <done>Export dropdown buttons visible on both Statistics and Exceptions tabs. Clicking "Export as Excel" downloads .xlsx file with correct table data. Clicking "Export as PDF" downloads .pdf file with title, date, and table. Filenames include academic year label. Buttons hidden during loading, error, or empty states.</done>
</task>

</tasks>

<verification>
1. `npx tsc --noEmit` passes — no type errors in new or modified files
2. `npx next build` succeeds — no build errors
3. On the Statistics tab with data loaded, the Export dropdown shows "Export as Excel" and "Export as PDF"
4. On the Exceptions tab with data loaded, the Export dropdown shows "Export as Excel" and "Export as PDF"
5. Downloaded Excel files open correctly and contain the expected columns and data
6. Downloaded PDF files have a title, generated date, and formatted table
7. Export buttons are NOT visible when data is loading, errored, or empty
</verification>

<success_criteria>
- lib/export-report.ts exports exportToExcel and exportToPdf
- Reports page has export dropdowns on both Statistics and Exceptions tabs
- Excel export produces valid .xlsx with correct headers and rows
- PDF export produces valid .pdf with title, date, and table
- Filenames contain academic year label (e.g., Statistics_2025-2026.xlsx)
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/9-export-reports-as-pdf-or-excel-for-marke/9-SUMMARY.md`
</output>
