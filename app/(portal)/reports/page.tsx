"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  Users,
  Building2,
  AlertTriangle,
  Clock,
  AlertCircle,
  Percent,
  Download,
  FileIcon,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────

type AcademicYear = {
  id: string;
  yearLabel: string;
  isActive?: boolean;
};

type StatRow = {
  facultyId: string;
  facultyName: string | null;
  submissionCount: number;
  percentageOfTotal: number;
  distinctContributors: number;
};

type ExceptionFile = {
  id: string;
  url: string;
  filename: string;
  contentType: string | null;
  size: number | null;
};

type ExceptionRow = {
  id: string;
  title: string | null;
  studentName: string | null;
  facultyName: string | null;
  submittedAt: string | null;
  daysSinceSubmission: number | null;
  files?: ExceptionFile[];
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

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  // Role detection: coordinators/guests only see the active year (no year picker)
  const { data: session } = useSession();
  const role = session?.user?.role ?? null;
  const canSwitchYear = role === "MARKETING_MANAGER" || role === "ADMINISTRATOR" || role === "MARKETING_COORDINATOR";

  // Academic year selector
  const [allYears, setAllYears] = useState<AcademicYear[]>([]);
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

  // Exception detail slide-over
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);

  // Track which tab is active (to lazy-load exceptions)
  const [activeTab, setActiveTab] = useState("statistics");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ── Fetch academic year on mount ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchYear() {
      setYearLoading(true);
      try {
        const res = await fetch("/api/academic-years");
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as {
            academicYear: AcademicYear | null;
            allYears?: AcademicYear[];
          };
          if (!cancelled) {
            if (data.allYears?.length) setAllYears(data.allYears);
            if (data.academicYear) setSelectedYearId(data.academicYear.id);
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

  // ── Exception counts & helpers ──────────────────────────────────────────────
  const overdueCount = exceptionsData.filter((e) => (e.daysSinceSubmission ?? 0) >= 14).length;
  const pendingCount = exceptionsData.filter((e) => (e.daysSinceSubmission ?? 0) < 14).length;

  const selectedException = exceptionsData.find((e) => e.id === selectedExceptionId) ?? null;

  function exceptionRowClass(days: number | null) {
    if (days === null) return "";
    if (days >= 14) return "bg-red-50 text-red-900";
    return "bg-amber-50 text-amber-900";
  }

  function daysLabel(days: number | null) {
    if (days === null) return "-";
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="space-y-6 text-slate-900">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="text-slate-600">
          Statistical and exception reports for academic year submissions.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {/* Academic year selector — managers/admins can switch years; coordinators/guests see active year only */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Academic Year</span>
        {yearLoading || !mounted ? (
          <Skeleton className="h-9 w-44" />
        ) : canSwitchYear ? (
          <Select
            value={selectedYearId}
            onValueChange={(val) => setSelectedYearId(val)}
          >
            <SelectTrigger className="w-44 border-slate-200 bg-white text-slate-900">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white">
              {allYears.length > 0 ? (
                allYears.map((year) => (
                  <SelectItem key={year.id} value={year.id} className="text-slate-900">
                    {year.yearLabel}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="" disabled className="text-slate-400">
                  No academic years
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-slate-900">
            {allYears.find((y) => y.id === selectedYearId)?.yearLabel ?? "—"}
          </span>
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
          {statsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-slate-200 bg-white">
                  <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
                  <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                </Card>
              ))}
            </div>
          ) : statsError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {statsError}
            </div>
          ) : statsData.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-slate-500">No submission data available for this academic year.</p>
            </div>
          ) : statsData.length === 1 ? (
            /* ── Single-faculty view (Coordinator / Guest) ── */
            (() => {
              const faculty = statsData[0];
              return (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <h2 className="text-lg font-semibold">{faculty.facultyName ?? "Your Faculty"}</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="border-slate-200 bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-slate-500">
                            Submissions
                          </CardTitle>
                          <div className="rounded-lg bg-blue-50 p-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-slate-900">{faculty.submissionCount}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {faculty.submissionCount === 1 ? "submission" : "submissions"} this year
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-slate-500">
                            Contributors
                          </CardTitle>
                          <div className="rounded-lg bg-emerald-50 p-2">
                            <Users className="h-4 w-4 text-emerald-600" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-slate-900">{faculty.distinctContributors}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          unique {faculty.distinctContributors === 1 ? "student" : "students"}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 bg-white">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium text-slate-500">
                            Share of Total
                          </CardTitle>
                          <div className="rounded-lg bg-purple-50 p-2">
                            <Percent className="h-4 w-4 text-purple-600" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-slate-900">{faculty.percentageOfTotal.toFixed(1)}%</p>
                        <p className="mt-1 text-xs text-slate-500">
                          of all submissions university-wide
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })()
          ) : (
            /* ── Multi-faculty view (Manager / Admin) ── */
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        Total Submissions
                      </CardTitle>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{totalSubmissions}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {totalSubmissions === 1 ? "submission" : "submissions"} this year
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        Total Contributors
                      </CardTitle>
                      <div className="rounded-lg bg-emerald-50 p-2">
                        <Users className="h-4 w-4 text-emerald-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{totalContributors}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      unique {totalContributors === 1 ? "student" : "students"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        Faculties
                      </CardTitle>
                      <div className="rounded-lg bg-purple-50 p-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{totalFaculties}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      with submissions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-faculty data table */}
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
            </>
          )}
        </TabsContent>

        {/* ── Exceptions tab ── */}
        <TabsContent value="exceptions" className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {exceptionsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-slate-200 bg-white">
                  <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
                  <CardContent><Skeleton className="h-8 w-16" /></CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        Total Exceptions
                      </CardTitle>
                      <div className="rounded-lg bg-amber-50 p-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{exceptionsData.length}</p>
                    <p className="mt-1 text-xs text-slate-500">without coordinator comment</p>
                  </CardContent>
                </Card>

                <Card className="border-red-100 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-red-600">
                        Overdue
                      </CardTitle>
                      <div className="rounded-lg bg-red-50 p-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-700">{overdueCount}</p>
                    <p className="mt-1 text-xs text-slate-500">14+ days waiting</p>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        Awaiting Comment
                      </CardTitle>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
                    <p className="mt-1 text-xs text-slate-500">under 14 days</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Overdue toggle with counts */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOverdueToggle(false)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !overdueOnly
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Exceptions
              {!exceptionsLoading && (
                <Badge className={`text-xs ${!overdueOnly ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                  {exceptionsData.length}
                </Badge>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleOverdueToggle(true)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                overdueOnly
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Overdue Only
              {!exceptionsLoading && (
                <Badge className={`text-xs ${overdueOnly ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
                  {overdueOnly ? exceptionsData.length : overdueCount}
                </Badge>
              )}
            </button>
            {!exceptionsLoading && !overdueOnly && exceptionsData.length > 0 && (
              <span className="ml-2 text-xs text-slate-500">
                {overdueCount} overdue, {pendingCount} awaiting comment
              </span>
            )}
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-200" />
              Overdue (14+ days without coordinator comment)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" />
              Awaiting comment (under 14 days)
            </span>
          </div>

          {/* Exceptions table */}
          {exceptionsLoading ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {["Student Name", "Title", "Faculty", "Submitted Date", "Waiting Days"].map(
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
                    <th className="px-4 py-3 text-sm font-medium text-slate-700">Waiting Days</th>
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
                        className={`cursor-pointer border-t border-slate-200 ${exceptionRowClass(row.daysSinceSubmission)}`}
                        onClick={() => setSelectedExceptionId(row.id)}
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
                          {daysLabel(row.daysSinceSubmission)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Exception detail slide-over (read-only) */}
          <Sheet
            open={!!selectedExceptionId}
            onOpenChange={(open) => {
              if (!open) setSelectedExceptionId(null);
            }}
          >
            <SheetContent className="overflow-y-auto border-l border-slate-200 bg-white sm:max-w-md">
              {selectedException && (
                <>
                  <SheetHeader className="px-5 py-4 border-b border-slate-200">
                    <SheetTitle className="text-lg leading-snug">
                      {selectedException.title ?? (
                        <span className="italic text-slate-400">Untitled</span>
                      )}
                    </SheetTitle>
                    <SheetDescription className="text-sm text-slate-500">
                      Exception detail — no coordinator comment received
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-5 px-5 py-5">
                    {/* Status badge */}
                    <div>
                      {(selectedException.daysSinceSubmission ?? 0) >= 14 ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          Overdue — {daysLabel(selectedException.daysSinceSubmission)} without comment
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                          Awaiting comment — {daysLabel(selectedException.daysSinceSubmission)}
                        </Badge>
                      )}
                    </div>

                    {/* Detail fields */}
                    <div className="space-y-3">
                      <DetailField label="Student" value={selectedException.studentName ?? "Unknown"} />
                      <DetailField label="Faculty" value={selectedException.facultyName ?? "Unknown"} />
                      <DetailField label="Submitted" value={formatDate(selectedException.submittedAt)} />
                      <DetailField
                        label={allYears.find((y) => y.id === selectedYearId)?.isActive ? "Waiting for Comment" : "Waited for Comment"}
                        value={daysLabel(selectedException.daysSinceSubmission)}
                      />
                    </div>

                    {/* Uploaded files */}
                    {(selectedException.files?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Files ({selectedException.files!.length})
                        </p>
                        <ul className="space-y-1.5">
                          {selectedException.files!.map((file) => (
                            <li key={file.id}>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                <span className="flex-1 truncate">{file.filename}</span>
                                {file.size !== null && (
                                  <span className="shrink-0 text-xs text-slate-400">
                                    {formatFileSize(file.size)}
                                  </span>
                                )}
                                <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </TabsContent>
      </Tabs>
    </main>
  );
}
