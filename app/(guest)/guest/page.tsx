"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  FileText,
  CalendarDays,
  User,
  Users,
} from "lucide-react";

type SubmissionRow = {
  id: string;
  title: string | null;
  studentName: string;
  submittedAt: string | null;
  fileCount: number;
  description: string | null;
  preview: {
    overview: string | null;
    contentTitles: string[];
  };
};

type AvailableYear = {
  id: string;
  yearLabel: string;
  isActive: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return format(d, "dd MMM yyyy");
}

export default function GuestMagazinePage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [facultyName, setFacultyName] = useState<string>("Faculty");
  const [academicYearLabel, setAcademicYearLabel] = useState<string | null>(
    null
  );
  const [availableYears, setAvailableYears] = useState<AvailableYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<{
    totalSubmissions: number;
    percentageOfTotal: number;
    distinctContributors: number;
  }>({ totalSubmissions: 0, percentageOfTotal: 0, distinctContributors: 0 });
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "SUBMITTED_DESC" | "SUBMITTED_ASC" | "TITLE_ASC" | "AUTHOR_ASC"
  >("SUBMITTED_DESC");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Track whether the initial load has completed to avoid double-fetch
  const initialLoadDone = useRef(false);

  useEffect(() => {
    // Skip re-fetch when selectedYearId is being set from the initial load response
    if (initialLoadDone.current && !selectedYearId) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const url = selectedYearId
          ? `/api/guest/submissions?yearId=${selectedYearId}`
          : "/api/guest/submissions";
        const res = await fetch(url);
        if (cancelled) return;

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(
            payload?.error ?? "Failed to load articles. Please try again."
          );
          setSubmissions([]);
          return;
        }

        const data = (await res.json()) as {
          submissions: SubmissionRow[];
          facultyName: string;
          academicYearLabel: string | null;
          availableYears: AvailableYear[];
          selectedYearId: string | null;
          summaryStats?: {
            totalSubmissions: number;
            percentageOfTotal: number;
            distinctContributors: number;
          };
        };

        if (!cancelled) {
          setSubmissions(data.submissions ?? []);
          setFacultyName(data.facultyName);
          setAcademicYearLabel(data.academicYearLabel);
          setAvailableYears(data.availableYears ?? []);
          setSummaryStats(data.summaryStats ?? { totalSubmissions: 0, percentageOfTotal: 0, distinctContributors: 0 });

          // On initial load, set the selectedYearId from the API response.
          // This won't trigger a re-fetch because initialLoadDone marks it as complete.
          if (!initialLoadDone.current && data.selectedYearId) {
            initialLoadDone.current = true;
            setSelectedYearId(data.selectedYearId);
          } else if (!initialLoadDone.current) {
            initialLoadDone.current = true;
          }
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load articles. Please try again.");
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selectedYearId]);

  // Derived state: are we refetching after initial load (year switch)?
  const isRefetching = loading && availableYears.length > 0;
  const visibleSubmissions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = submissions.filter((submission) => {
      if (!query) return true;
      const title = (submission.title ?? "").toLowerCase();
      const author = (submission.studentName ?? "").toLowerCase();
      return title.includes(query) || author.includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "TITLE_ASC") {
        return (a.title ?? "Untitled").localeCompare(b.title ?? "Untitled");
      }
      if (sortBy === "AUTHOR_ASC") {
        return a.studentName.localeCompare(b.studentName);
      }
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return sortBy === "SUBMITTED_ASC" ? aTime - bTime : bTime - aTime;
    });
  }, [submissions, searchTerm, sortBy]);
  const paginatedSubmissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleSubmissions.slice(start, start + pageSize);
  }, [visibleSubmissions, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, selectedYearId]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(visibleSubmissions.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [visibleSubmissions.length, page, pageSize]);

  // ---- Loading state (initial load only) ----
  if (loading && !isRefetching) {
    return (
      <main>
        {/* Hero skeleton */}
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-6 rounded-2xl animate-pulse bg-slate-200 h-48 sm:h-56" />

        {/* Overview skeleton */}
        <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-slate-200 bg-white">
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-14" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`row-${i}`}
                className="grid grid-cols-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 mt-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 sm:px-8 lg:px-10 py-12 sm:py-16">
        {/* Decorative icon */}
        <BookOpen className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 h-32 w-32 sm:h-40 sm:w-40 text-white/5" />

        <div className="relative z-10 space-y-5">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            {facultyName}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {availableYears.length > 1 ? (
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white hover:bg-white/15 animate-silver-glass cursor-pointer [&_svg]:text-slate-300/50">
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
            <span className="text-lg text-slate-300">
              {submissions.length} Selected{" "}
              {submissions.length === 1 ? "Article" : "Articles"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Overview</h2>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-slate-200/60 bg-white shadow-sm text-slate-900">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Selected Articles</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{submissions.length}</p>
                <p className="text-xs text-slate-500 mt-1">selected for publication</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 bg-white shadow-sm text-slate-900">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Submissions</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summaryStats.totalSubmissions}</p>
                <p className="text-xs text-slate-500 mt-1">{summaryStats.percentageOfTotal.toFixed(1)}% of university total</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 bg-white shadow-sm text-slate-900">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Contributors</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Users className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{summaryStats.distinctContributors}</p>
                <p className="text-xs text-slate-500 mt-1">unique {summaryStats.distinctContributors === 1 ? "student" : "students"}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Publications table */}
      <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-8">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Selected Publications</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find by title or author"
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 sm:w-64"
            />
            <Select
              value={sortBy}
              onValueChange={(value) =>
                setSortBy(
                  value as
                    | "SUBMITTED_DESC"
                    | "SUBMITTED_ASC"
                    | "TITLE_ASC"
                    | "AUTHOR_ASC"
                )
              }
            >
              <SelectTrigger className="h-9 w-full border-slate-200 text-sm text-slate-700 sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUBMITTED_DESC">Submitted Date (Newest)</SelectItem>
                <SelectItem value="SUBMITTED_ASC">Submitted Date (Oldest)</SelectItem>
                <SelectItem value="TITLE_ASC">Title (A-Z)</SelectItem>
                <SelectItem value="AUTHOR_ASC">Author (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {visibleSubmissions.length === 0 && !isRefetching ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <BookOpen className="h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700">
              {submissions.length === 0 ? "No Articles Yet" : "No Matching Results"}
            </h2>
            <p className="mt-2 max-w-md text-slate-500">
              {submissions.length === 0
                ? "No articles have been selected for publication in your faculty yet. Check back later for new content."
                : "Try another title, author name, or sorting option."}
            </p>
          </div>
        ) : (
          <>
            <div className={`space-y-3 md:hidden transition-opacity duration-200 ${isRefetching ? "opacity-50 pointer-events-none" : ""}`}>
              {paginatedSubmissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedSubmission(submission)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {submission.title ?? <span className="italic text-slate-400">Untitled</span>}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Author</span>
                      <span className="font-medium text-slate-700">{submission.studentName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Submitted</span>
                      <span className="font-medium text-slate-700">{formatDate(submission.submittedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Files</span>
                      <span className="font-medium text-slate-700">
                        {submission.fileCount} {submission.fileCount === 1 ? "file" : "files"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      Preview
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <div
              className={`hidden overflow-x-auto rounded-xl border border-slate-200 bg-white transition-opacity duration-200 md:block ${
                isRefetching ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Title</th>
                    <th className="px-4 py-3 text-left font-medium">Author</th>
                    <th className="px-4 py-3 text-left font-medium">Submitted</th>
                    <th className="px-4 py-3 text-left font-medium">Files</th>
                    <th className="px-4 py-3 text-left font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <td className="px-4 py-3 text-slate-900">
                        {submission.title ?? (
                          <span className="italic text-slate-400">Untitled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{submission.studentName}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(submission.submittedAt)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {submission.fileCount} {submission.fileCount === 1 ? "file" : "files"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">View</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={visibleSubmissions.length}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 25]}
            />
          </>
        )}
      </div>

      {/* Detail slide-over */}
      <Sheet
        open={!!selectedSubmission}
        onOpenChange={(open) => !open && setSelectedSubmission(null)}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedSubmission && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">
                  {selectedSubmission.title ?? (
                    <span className="italic text-slate-400">Untitled</span>
                  )}
                </SheetTitle>
                <SheetDescription>
                  by {selectedSubmission.studentName}
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 space-y-5">
                {/* Submitted date */}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>
                    Submitted {formatDate(selectedSubmission.submittedAt)}
                  </span>
                </div>

                {/* Description/notes */}
                {selectedSubmission.description && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-slate-700">
                      Description
                    </h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {selectedSubmission.description}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-slate-700">Contribution Overview</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {selectedSubmission.preview?.overview?.trim() || "No overview provided."}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700">Content Titles</h4>
                  {(selectedSubmission.preview?.contentTitles?.length ?? 0) > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {selectedSubmission.preview.contentTitles.map((contentTitle) => (
                        <li key={contentTitle}>{contentTitle}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">No content titles provided.</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Attached files: {selectedSubmission.fileCount}{" "}
                  {selectedSubmission.fileCount === 1 ? "file" : "files"}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
