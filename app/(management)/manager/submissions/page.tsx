"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SubmissionRow = {
  id: string;
  title: string | null;
  studentName: string;
  facultyName: string;
  submittedAt: string | null;
  fileCount: number;
};

type Faculty = {
  id: string;
  name: string;
};

export default function ManagerSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fetch faculties and academic year on mount
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

        const data = (await res.json()) as { submissions: SubmissionRow[] };
        if (!cancelled) setSubmissions(data.submissions ?? []);
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


  async function handleDownloadZip() {
    setDownloading(true);
    try {
      const res = await fetch("/api/manager/submissions/download");
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
      anchor.download = "selected-submissions.zip";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setDownloading(false);
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
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-6 text-slate-900 sm:px-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">Selected Submissions</h1>
          {!loading && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {submissions.length}
            </Badge>
          )}
        </div>
        <p className="text-slate-600">
          All selected submissions across all faculties.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Faculty filter */}
        <div className="flex items-center gap-3">
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

          {selectedFacultyName && !loading && (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-700"
            >
              {submissions.length} in {selectedFacultyName}
            </Badge>
          )}
        </div>

        {/* Download ZIP button */}
        <Button
          onClick={handleDownloadZip}
          disabled={downloading}
          className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download ZIP
            </>
          )}
        </Button>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Student Name</th>
                <th className="px-4 py-3 text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-sm font-medium">Faculty</th>
                <th className="px-4 py-3 text-sm font-medium">
                  Submitted Date
                </th>
                <th className="px-4 py-3 text-sm font-medium">Files</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-slate-500">
            No submissions have been selected for publication yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Student Name</th>
                <th className="px-4 py-3 text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-sm font-medium">Faculty</th>
                <th className="px-4 py-3 text-sm font-medium">
                  Submitted Date
                </th>
                <th className="px-4 py-3 text-sm font-medium">Files</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr
                  key={submission.id}
                  className="border-t border-slate-200 text-slate-900 hover:bg-slate-50"
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
      )}
    </main>
  );
}
