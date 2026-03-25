"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Download, FileIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubmissionFile = {
  id: string;
  url: string;
  filename: string;
  contentType: string | null;
  size: number | null;
};

type SubmissionRow = {
  id: string;
  title: string | null;
  studentName: string;
  facultyName: string;
  submittedAt: string | null;
  fileCount: number;
  academicYearId: string | null;
  notes: string | null;
  isSelected: boolean;
  reviewStatus: string;
  files: SubmissionFile[];
};

type Faculty = {
  id: string;
  name: string;
};

type AcademicYear = {
  id: string;
  yearLabel: string;
  isActive: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseAcademicYearRange(value: string) {
  const matches = value.match(/\d{4}/g);
  if (!matches || matches.length < 2) return null;
  const startYear = Number.parseInt(matches[0], 10);
  const endYear = Number.parseInt(matches[1], 10);
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) return null;
  return { startYear, endYear };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ManagerSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [academicStartYear, setAcademicStartYear] = useState("");
  const [academicEndYear, setAcademicEndYear] = useState("");
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingYearId, setDownloadingYearId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Slide-over state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch faculties on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchStaticData() {
      try {
        const facultiesRes = await fetch("/api/faculties");
        if (cancelled) return;

        if (facultiesRes.ok) {
          const data = (await facultiesRes.json()) as { faculties: Faculty[] };
          if (!cancelled) setFaculties(data.faculties ?? []);
        }
      } catch {
        // Non-critical — faculty filter still works
      }
    }

    fetchStaticData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch submissions whenever faculty filter changes
  useEffect(() => {
    let cancelled = false;

    async function fetchSubmissions() {
      setLoading(true);
      setError(null);

      try {
        const url = selectedFacultyId && selectedFacultyId !== "all"
          ? `/api/manager/submissions?facultyId=${encodeURIComponent(selectedFacultyId)}`
          : "/api/manager/submissions";

        const res = await fetch(url);
        if (cancelled) return;

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(
            payload?.error ?? "Failed to load submissions. Please try again."
          );
          setSubmissions([]);
          return;
        }

        const data = (await res.json()) as {
          submissions: SubmissionRow[];
          academicYears?: AcademicYear[];
        };
        if (!cancelled) {
          setSubmissions(data.submissions ?? []);
          if (data.academicYears?.length) setAcademicYears(data.academicYears);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load submissions. Please try again.");
          setSubmissions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubmissions();
    return () => {
      cancelled = true;
    };
  }, [selectedFacultyId]);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rawStartYear = academicStartYear.trim();
    const rawEndYear = academicEndYear.trim();
    const startYearFilter = /^\d{4}$/.test(rawStartYear)
      ? Number.parseInt(rawStartYear, 10)
      : null;
    const endYearFilter = /^\d{4}$/.test(rawEndYear)
      ? Number.parseInt(rawEndYear, 10)
      : null;
    const yearLabelMap = new Map<string, string>(
      academicYears.map((year) => [year.id, year.yearLabel])
    );

    if (!q && startYearFilter === null && endYearFilter === null) return submissions;

    return submissions.filter((sub) => {
      const student = sub.studentName.toLowerCase();
      const title = (sub.title ?? "").toLowerCase();
      const faculty = sub.facultyName.toLowerCase();
      const matchesQuery =
        q.length === 0 || student.includes(q) || title.includes(q) || faculty.includes(q);
      if (!matchesQuery) return false;

      if (startYearFilter === null && endYearFilter === null) return true;

      const yearLabel =
        sub.academicYearId && yearLabelMap.has(sub.academicYearId)
          ? yearLabelMap.get(sub.academicYearId)!
          : "";
      const parsedAcademicYear = parseAcademicYearRange(yearLabel);
      if (!parsedAcademicYear) return false;
      if (startYearFilter !== null && parsedAcademicYear.startYear < startYearFilter) return false;
      if (endYearFilter !== null && parsedAcademicYear.endYear > endYearFilter) return false;
      return true;
    });
  }, [submissions, searchQuery, academicStartYear, academicEndYear, academicYears]);

  // Group submissions by academic year
  const groupedByYear = useMemo(() => {
    const yearMap = new Map<string, { label: string; submissions: SubmissionRow[] }>();

    // Build a lookup from academic year IDs to labels
    const yearLabelMap = new Map<string, string>(
      academicYears.map((y) => [y.id, y.yearLabel])
    );

    for (const sub of filteredSubmissions) {
      const yearId = sub.academicYearId ?? "unknown";
      const yearLabel = yearId === "unknown"
        ? "Unknown Year"
        : yearLabelMap.get(yearId) ?? yearId;

      if (!yearMap.has(yearId)) {
        yearMap.set(yearId, { label: yearLabel, submissions: [] });
      }
      yearMap.get(yearId)!.submissions.push(sub);
    }

    // Sort by year label descending (most recent first)
    return [...yearMap.entries()].sort((a, b) =>
      b[1].label.localeCompare(a[1].label)
    );
  }, [filteredSubmissions, academicYears]);

  useEffect(() => {
    if (groupedByYear.length === 0) {
      setActiveYearId(null);
      return;
    }
    const hasCurrent = activeYearId !== null && groupedByYear.some(([yearId]) => yearId === activeYearId);
    if (!hasCurrent) {
      setActiveYearId(groupedByYear[0][0]);
    }
  }, [groupedByYear, activeYearId]);

  // Derive selected submission from state
  const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionId) ?? null;

  async function handleDownloadZip(academicYearId: string, yearLabel: string) {
    setDownloadingYearId(academicYearId);
    try {
      const url = academicYearId === "unknown"
        ? "/api/manager/submissions/download"
        : `/api/manager/submissions/download?academicYearId=${encodeURIComponent(academicYearId)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(
          payload?.error ?? "Failed to download ZIP. Please try again."
        );
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `selected-submissions-${yearLabel}.zip`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloadingYearId(null);
    }
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return format(d, "dd MMM yyyy, HH:mm");
  }

  const selectedFacultyName = selectedFacultyId && selectedFacultyId !== "all"
    ? faculties.find((f) => f.id === selectedFacultyId)?.name
    : null;

  return (
    <main className="space-y-6 text-slate-900">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">Selected Submissions</h1>
          {!loading && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {filteredSubmissions.length} {filteredSubmissions.length === 1 ? "submission" : "submissions"}
            </Badge>
          )}
        </div>
        <p className="text-slate-600">
          All selected submissions across all faculties, organised by academic year tabs.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {/* Faculty filter */}
      <div className="flex flex-wrap items-center gap-3">
        {mounted ? (
          <Select
            value={selectedFacultyId}
            onValueChange={setSelectedFacultyId}
          >
            <SelectTrigger className="w-56 border-slate-200 bg-white text-slate-900">
              <SelectValue placeholder="All Faculties" />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white">
              <SelectItem value="all" className="text-slate-900">
                All Faculties
              </SelectItem>
              {faculties.map((faculty) => (
                <SelectItem
                  key={faculty.id}
                  value={faculty.id}
                  className="text-slate-900"
                >
                  {faculty.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-9 w-56 rounded-md border border-slate-200 bg-white" />
        )}

        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter by student, title, or faculty"
          className="w-full max-w-md border-slate-200 bg-white"
        />

        <Input
          type="number"
          inputMode="numeric"
          value={academicStartYear}
          onChange={(event) => setAcademicStartYear(event.target.value)}
          placeholder="Academic start year"
          className="w-32 border-slate-200 bg-white"
        />

        <Input
          type="number"
          inputMode="numeric"
          value={academicEndYear}
          onChange={(event) => setAcademicEndYear(event.target.value)}
          placeholder="Academic end year"
          className="w-32 border-slate-200 bg-white"
        />

        {selectedFacultyName && !loading && (
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700"
          >
            {filteredSubmissions.length} {filteredSubmissions.length === 1 ? "submission" : "submissions"} in {selectedFacultyName}
          </Badge>
        )}
      </div>

      {/* Content area */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium">Student Name</th>
                  <th className="px-4 py-3 text-sm font-medium">Title</th>
                  <th className="px-4 py-3 text-sm font-medium">Faculty</th>
                  <th className="px-4 py-3 text-sm font-medium">Submitted Date</th>
                  <th className="px-4 py-3 text-sm font-medium">Files</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-slate-500">
            No submissions match the selected filters.
          </p>
        </div>
      ) : (
        <Tabs
          value={activeYearId ?? groupedByYear[0][0]}
          onValueChange={setActiveYearId}
          className="space-y-4"
        >
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 bg-slate-100 p-2">
            {groupedByYear.map(([yearId, { label, submissions: yearSubs }]) => (
              <TabsTrigger key={yearId} value={yearId} className="gap-2">
                {label}
                <Badge className="bg-slate-200 text-slate-700 border-slate-300">
                  {yearSubs.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {groupedByYear.map(([yearId, { label, submissions: yearSubs }]) => (
            <TabsContent key={yearId} value={yearId} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                    {yearSubs.length} {yearSubs.length === 1 ? "submission" : "submissions"}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleDownloadZip(yearId, label)}
                  disabled={downloadingYearId !== null}
                  className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
                >
                  {downloadingYearId === yearId ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Download ZIP
                    </>
                  )}
                </Button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-sm font-medium">Student Name</th>
                      <th className="px-4 py-3 text-sm font-medium">Title</th>
                      <th className="px-4 py-3 text-sm font-medium">Faculty</th>
                      <th className="px-4 py-3 text-sm font-medium">Submitted Date</th>
                      <th className="px-4 py-3 text-sm font-medium">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearSubs.map((submission) => (
                      <tr
                        key={submission.id}
                        className="cursor-pointer border-t border-slate-200 text-slate-900 hover:bg-slate-50"
                        onClick={() => setSelectedSubmissionId(submission.id)}
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {submission.studentName}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {submission.title ?? (
                            <span className="italic text-slate-400">Untitled</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {submission.facultyName}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {formatDate(submission.submittedAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {submission.fileCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Slide-over panel */}
      <Sheet
        open={!!selectedSubmissionId}
        onOpenChange={(open) => { if (!open) setSelectedSubmissionId(null); }}
      >
        <SheetContent
          side="right"
          className="w-120 sm:max-w-140 overflow-y-auto p-0"
        >
          {selectedSubmission && (
            <>
              {/* Panel header — sticky */}
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
                <SheetHeader className="px-5 py-4">
                  <SheetTitle className="text-lg leading-snug">
                    {selectedSubmission.title ?? (
                      <span className="italic text-slate-400">Untitled</span>
                    )}
                  </SheetTitle>
                  <SheetDescription className="text-sm text-slate-500">
                    {selectedSubmission.studentName} &mdash; {selectedSubmission.facultyName}
                  </SheetDescription>
                </SheetHeader>
              </div>

              {/* Details section */}
              <div className="border-b border-slate-200 px-5 py-4 space-y-3">
                {/* Submission date */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Submitted
                  </span>
                  <span className="text-sm text-slate-700">
                    {formatDate(selectedSubmission.submittedAt)}
                  </span>
                </div>

                {/* Review status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Review Status
                  </span>
                  {selectedSubmission.reviewStatus === "COMMENTED" ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Commented</Badge>
                  ) : selectedSubmission.reviewStatus === "REVIEWING" ? (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Reviewing</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-600 border-slate-200">Pending</Badge>
                  )}
                </div>

                {/* Selection status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Selection
                  </span>
                  {selectedSubmission.isSelected ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Selected</Badge>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </div>
              </div>

              {/* Notes section (only if non-null and non-empty) */}
              {selectedSubmission.notes && selectedSubmission.notes.trim() !== "" && (
                <div className="border-b border-slate-200 px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedSubmission.notes}
                  </p>
                </div>
              )}

              {/* Files section */}
              {selectedSubmission.files.length > 0 && (
                <div className="px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Files ({selectedSubmission.files.length})
                  </p>
                  <ul className="space-y-1.5">
                    {selectedSubmission.files.map((file) => (
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
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
