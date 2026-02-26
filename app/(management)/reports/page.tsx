"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type AcademicYear = {
  id: string;
  yearLabel: string;
};

type StatRow = {
  facultyId: string;
  facultyName: string | null;
  submissionCount: number;
  percentageOfTotal: number;
  distinctContributors: number;
};

type ExceptionRow = {
  id: string;
  title: string | null;
  studentName: string | null;
  facultyName: string | null;
  submittedAt: string | null;
  daysSinceSubmission: number | null;
};

type SortColumn = "facultyName" | "submissionCount" | "percentageOfTotal" | "distinctContributors";
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SortIcon({
  column,
  sortCol,
  sortDir,
}: {
  column: SortColumn;
  sortCol: SortColumn;
  sortDir: SortDir;
}) {
  if (column !== sortCol) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="inline h-3 w-3 ml-1" />
    : <ChevronDown className="inline h-3 w-3 ml-1" />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  // Academic year selector
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [yearLoading, setYearLoading] = useState(true);

  // Statistics tab state
  const [statsData, setStatsData] = useState<StatRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Sorting state for statistics table
  const [sortCol, setSortCol] = useState<SortColumn>("facultyName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Exceptions tab state
  const [exceptionsData, setExceptionsData] = useState<ExceptionRow[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionsError, setExceptionsError] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Track which tab is active (to lazy-load exceptions)
  const [activeTab, setActiveTab] = useState("statistics");

  // ── Fetch academic year on mount ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchYear() {
      setYearLoading(true);
      try {
        const res = await fetch("/api/academic-years");
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { academicYear: AcademicYear | null };
          if (!cancelled && data.academicYear) {
            setActiveYear(data.academicYear);
            setSelectedYearId(data.academicYear.id);
          }
        }
      } catch {
        // Non-critical — selector remains empty, fetches will still use default
      } finally {
        if (!cancelled) setYearLoading(false);
      }
    }
    fetchYear();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch statistics ────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (yearId: string) => {
    if (!yearId) return;
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(
        `/api/reports?type=submissions&academicYearId=${encodeURIComponent(yearId)}`
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatsError(payload?.error ?? "Failed to load statistics. Please try again.");
        setStatsData([]);
        return;
      }
      const data = (await res.json()) as { data: StatRow[] };
      setStatsData(data.data ?? []);
    } catch {
      setStatsError("Failed to load statistics. Please try again.");
      setStatsData([]);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch exceptions ────────────────────────────────────────────────────────
  const fetchExceptions = useCallback(async (yearId: string, overdue: boolean) => {
    if (!yearId) return;
    setExceptionsLoading(true);
    setExceptionsError(null);
    try {
      const url = `/api/reports?type=exceptions&academicYearId=${encodeURIComponent(yearId)}${overdue ? "&overdue=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setExceptionsError(payload?.error ?? "Failed to load exceptions. Please try again.");
        setExceptionsData([]);
        return;
      }
      const data = (await res.json()) as { data: ExceptionRow[] };
      setExceptionsData(data.data ?? []);
    } catch {
      setExceptionsError("Failed to load exceptions. Please try again.");
      setExceptionsData([]);
    } finally {
      setExceptionsLoading(false);
    }
  }, []);

  // Re-fetch when year changes
  useEffect(() => {
    if (!selectedYearId) return;
    fetchStats(selectedYearId);
    if (activeTab === "exceptions") {
      fetchExceptions(selectedYearId, overdueOnly);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId]);

  // Re-fetch exceptions when tab switches to "exceptions" for the first time
  function handleTabChange(value: string) {
    setActiveTab(value);
    if (value === "exceptions" && selectedYearId && exceptionsData.length === 0 && !exceptionsLoading) {
      fetchExceptions(selectedYearId, overdueOnly);
    }
  }

  // Re-fetch exceptions when overdue toggle changes
  function handleOverdueToggle(onlyOverdue: boolean) {
    setOverdueOnly(onlyOverdue);
    if (selectedYearId) {
      fetchExceptions(selectedYearId, onlyOverdue);
    }
  }

  // ── Sorting logic ───────────────────────────────────────────────────────────
  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sortedStats = [...statsData].sort((a, b) => {
    let aVal: string | number = a[sortCol] ?? 0;
    let bVal: string | number = b[sortCol] ?? 0;
    if (sortCol === "facultyName") {
      aVal = (a.facultyName ?? "").toLowerCase();
      bVal = (b.facultyName ?? "").toLowerCase();
    }
    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // ── Summary card values ─────────────────────────────────────────────────────
  const totalSubmissions = statsData.reduce((s, r) => s + r.submissionCount, 0);
  const totalContributors = statsData.reduce((s, r) => s + r.distinctContributors, 0);
  const totalFaculties = statsData.length;

  // ── Exception row color ─────────────────────────────────────────────────────
  function exceptionRowClass(days: number | null) {
    if (days === null) return "";
    if (days >= 14) return "bg-red-50 text-red-900";
    return "bg-amber-50 text-amber-900";
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-6 text-slate-900 sm:px-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="text-slate-600">
          Statistical and exception reports for academic year submissions.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {/* Academic year selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Academic Year</span>
        {yearLoading ? (
          <Skeleton className="h-9 w-44" />
        ) : (
          <Select
            value={selectedYearId}
            onValueChange={(val) => setSelectedYearId(val)}
          >
            <SelectTrigger className="w-44 border-slate-200 bg-white text-slate-900">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white">
              {activeYear ? (
                <SelectItem value={activeYear.id} className="text-slate-900">
                  {activeYear.yearLabel}
                </SelectItem>
              ) : (
                <SelectItem value="" disabled className="text-slate-400">
                  No active year
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="statistics" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        {/* ── Statistics tab ── */}
        <TabsContent value="statistics" className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statsLoading ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-slate-200 bg-white">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Total Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{totalSubmissions}</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Total Contributors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{totalContributors}</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">
                      Faculties
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{totalFaculties}</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Data table */}
          {statsLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {["Faculty Name", "Submissions", "% of Total", "Contributors"].map((h) => (
                      <th key={h} className="px-4 py-3 text-sm font-medium text-slate-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : statsError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {statsError}
            </div>
          ) : statsData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-slate-500">No submission data available for this academic year.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {(
                      [
                        { col: "facultyName", label: "Faculty Name" },
                        { col: "submissionCount", label: "Submissions" },
                        { col: "percentageOfTotal", label: "% of Total" },
                        { col: "distinctContributors", label: "Contributors" },
                      ] as { col: SortColumn; label: string }[]
                    ).map(({ col, label }) => (
                      <th
                        key={col}
                        className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 select-none hover:text-slate-900"
                        onClick={() => handleSort(col)}
                      >
                        {label}
                        <SortIcon column={col} sortCol={sortCol} sortDir={sortDir} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((row) => (
                    <tr
                      key={row.facultyId}
                      className="border-t border-slate-200 text-slate-900 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {row.facultyName ?? <span className="italic text-slate-400">Unknown</span>}
                      </td>
                      <td className="px-4 py-3 text-sm">{row.submissionCount}</td>
                      <td className="px-4 py-3 text-sm">{row.percentageOfTotal.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-sm">{row.distinctContributors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Exceptions tab ── */}
        <TabsContent value="exceptions" className="space-y-4">
          {/* Overdue toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOverdueToggle(false)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !overdueOnly
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Exceptions
            </button>
            <button
              type="button"
              onClick={() => handleOverdueToggle(true)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                overdueOnly
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Overdue Only (14+ days)
            </button>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-200" />
              14+ days overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" />
              No coordinator comment
            </span>
          </div>

          {/* Exceptions table */}
          {exceptionsLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {["Student Name", "Title", "Faculty", "Submitted Date", "Days Since"].map(
                      (h) => (
                        <th key={h} className="px-4 py-3 text-sm font-medium text-slate-700">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : exceptionsError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {exceptionsError}
            </div>
          ) : exceptionsData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-slate-500">
                No exceptions found — all submissions have coordinator comments.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-sm font-medium text-slate-700">Student Name</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-700">Title</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-700">Faculty</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-700">Submitted Date</th>
                    <th className="px-4 py-3 text-sm font-medium text-slate-700">Days Since</th>
                  </tr>
                </thead>
                <tbody>
                  {[...exceptionsData]
                    .sort(
                      (a, b) =>
                        (b.daysSinceSubmission ?? 0) - (a.daysSinceSubmission ?? 0)
                    )
                    .map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t border-slate-200 ${exceptionRowClass(row.daysSinceSubmission)}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {row.studentName ?? <span className="italic opacity-60">Unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.title ?? <span className="italic opacity-60">Untitled</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.facultyName ?? <span className="italic opacity-60">Unknown</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">{formatDate(row.submittedAt)}</td>
                        <td className="px-4 py-3 text-sm">
                          {row.daysSinceSubmission !== null ? row.daysSinceSubmission : "-"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
