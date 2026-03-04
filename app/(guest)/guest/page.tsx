"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileText,
  ImageIcon,
  File,
  CalendarDays,
  User,
  Download,
} from "lucide-react";

type FileItem = {
  id: string;
  url: string;
  pathname: string;
  contentType: string | null;
  size: number;
};

type SubmissionRow = {
  id: string;
  title: string | null;
  studentName: string;
  submittedAt: string | null;
  fileCount: number;
  description: string | null;
  files: FileItem[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(contentType: string | null) {
  if (contentType?.startsWith("image")) return ImageIcon;
  if (
    contentType?.includes("pdf") ||
    contentType?.includes("document") ||
    contentType?.includes("text")
  )
    return FileText;
  return File;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
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
            payload?.error ?? "Failed to load articles. Please try again."
          );
          setSubmissions([]);
          return;
        }

        const data = (await res.json()) as {
          submissions: SubmissionRow[];
          facultyName: string;
          academicYearLabel: string | null;
        };

        if (!cancelled) {
          setSubmissions(data.submissions ?? []);
          setFacultyName(data.facultyName);
          setAcademicYearLabel(data.academicYearLabel);
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
  }, []);

  // ---- Loading state ----
  if (loading) {
    return (
      <main>
        {/* Hero skeleton */}
        <div className="mx-4 sm:mx-6 lg:mx-8 mt-6 rounded-2xl animate-pulse bg-slate-200 h-48 sm:h-56" />

        {/* Grid skeleton */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-slate-200 bg-white">
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </CardFooter>
              </Card>
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

        <div className="relative z-10 space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            {facultyName}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {academicYearLabel && (
              <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 hover:bg-amber-400/30">
                {academicYearLabel}
              </Badge>
            )}
            <span className="text-lg text-slate-300">
              {submissions.length} Selected{" "}
              {submissions.length === 1 ? "Article" : "Articles"}
            </span>
          </div>
        </div>
      </div>

      {/* Articles grid */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {submissions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <BookOpen className="h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-semibold text-slate-700">
              No Articles Yet
            </h2>
            <p className="mt-2 max-w-md text-slate-500">
              No articles have been selected for publication in your faculty
              yet. Check back later for new content.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((submission) => (
              <Card
                key={submission.id}
                className="cursor-pointer border-slate-200 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                onClick={() => setSelectedSubmission(submission)}
              >
                <CardHeader>
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {submission.title ?? (
                      <span className="italic text-slate-400">Untitled</span>
                    )}
                  </h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{submission.studentName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>{formatDate(submission.submittedAt)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-600 border-slate-200"
                  >
                    {submission.fileCount}{" "}
                    {submission.fileCount === 1 ? "file" : "files"}
                  </Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
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

                <Separator />

                {/* Files section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-700">
                    Files ({selectedSubmission.files.length})
                  </h4>

                  {selectedSubmission.files.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No files attached.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSubmission.files.map((file) => {
                        const Icon = getFileIcon(file.contentType);
                        const filename =
                          file.pathname?.split("/").pop() ?? "file";

                        return (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                          >
                            <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {filename}
                              </p>
                              <p className="text-xs text-slate-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() =>
                                window.open(file.url, "_blank")
                              }
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
