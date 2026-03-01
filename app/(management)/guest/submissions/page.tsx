"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type SubmissionRow = {
  id: string;
  title: string | null;
  studentName: string;
  submittedAt: string | null;
  fileCount: number;
};

export default function GuestSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSubmissions() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/guest/submissions");
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
  }, []);

  function formatDate(value: string | null) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return format(d, "dd MMM yyyy, HH:mm");
  }

  return (
    <main className="space-y-6 text-slate-900">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">Selected Articles</h1>
          {!loading && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {submissions.length} {submissions.length === 1 ? "article" : "articles"}
            </Badge>
          )}
        </div>
        <p className="text-slate-600">
          Selected articles from your faculty available for publication.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {loading ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Student Name</th>
                <th className="px-4 py-3 text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-sm font-medium">
                  Submitted Date
                </th>
                <th className="px-4 py-3 text-sm font-medium">Files</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-48" />
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
            No articles have been selected for publication in your faculty yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Student Name</th>
                <th className="px-4 py-3 text-sm font-medium">Title</th>
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
                  className="border-t border-slate-200 text-slate-900"
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {submission.studentName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {submission.title ?? (
                      <span className="italic text-slate-400">Untitled</span>
                    )}
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
