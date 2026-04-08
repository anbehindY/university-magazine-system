"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";

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
  status: string;
  studentName: string | null;
  submittedAt: string | null;
  isSelected: boolean;
  notes: string | null;
  files: SubmissionFile[];
  fileCount: number;
  commentCount: number;
  reviewStatus: string;
};

type Comment = {
  id: string;
  body: string;
  authorRole: string;
  parentId: string | null;
  createdAt: string;
  author: { name: string | null; role: string | null };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatFileSize(bytes: number | null) {
  if (bytes === null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSubmittedDate(value: string | null) {
  if (!value) return "-";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function formatCommentTime(value: string) {
  try {
    return format(new Date(value), "dd MMM yyyy, HH:mm");
  } catch {
    return value;
  }
}

function formatRole(role: string | null) {
  if (!role) return "";
  switch (role) {
    case "MARKETING_COORDINATOR":
      return "Coordinator";
    case "STUDENT":
      return "Student";
    case "MARKETING_MANAGER":
      return "Manager";
    case "ADMINISTRATOR":
      return "Admin";
    case "GUEST":
      return "Guest";
    default:
      return role;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function CoordinatorSubmissionsPage() {
  // Submissions list state
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Slide-over panel state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);

  const [reviewStatusSaving, setReviewStatusSaving] = useState(false);

  // Filtering & sorting state
  const [filterStatus, setFilterStatus] = useState<"all" | "selected" | "not-selected" | "no-comments">("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "selected" | "no-comments-priority">("date-desc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Comment compose state
  const [commentBody, setCommentBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToAuthor, setReplyToAuthor] = useState<string>("");
  const [commentPosting, setCommentPosting] = useState(false);

  // Download tracking state (session-scoped, per-submission)
  const downloadedSubmissionsRef = useRef<Set<string>>(new Set());
  const [downloadVersion, setDownloadVersion] = useState(0);

  // Selection confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    submissionId: string;
    currentSelected: boolean;
    title: string | null;
  }>({ open: false, submissionId: "", currentSelected: false, title: null });
  const [reviewConfirmDialog, setReviewConfirmDialog] = useState<{
    open: boolean;
    submissionId: string;
    currentStatus: string;
  }>({ open: false, submissionId: "", currentStatus: "" });

  // ---------------------------------------------------------------------------
  // Load submissions on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchSubmissions() {
      setLoading(true);
      setError(null);
      try {
        const query = search.trim();
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          filter: filterStatus,
          sort: sortBy,
        });
        if (query) {
          params.set("q", query);
        }
        const url = `/api/coordinator/submissions?${params.toString()}`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          submissions?: SubmissionRow[];
          total?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load submissions.");
          setSubmissions([]);
          return;
        }
        setSubmissions(data.submissions ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (!cancelled) {
          setError("Failed to load submissions.");
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
  }, [page, pageSize, search, filterStatus, sortBy]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // ---------------------------------------------------------------------------
  // SWR comment thread (polls every 15 s)
  // ---------------------------------------------------------------------------

  const { data: commentsData, mutate: mutateComments } = useSWR(
    selectedSubmissionId
      ? `/api/comments?submissionId=${selectedSubmissionId}`
      : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const comments: Comment[] = commentsData?.comments ?? [];

  // ---------------------------------------------------------------------------
  // Derive selected submission object
  // ---------------------------------------------------------------------------

  const selectedSubmission = submissions.find(
    (s) => s.id === selectedSubmissionId
  ) ?? null;

  // ---------------------------------------------------------------------------
  // isSelected toggle
  // ---------------------------------------------------------------------------

  async function handleToggleSelected(id: string, current: boolean) {
    // Optimistic update
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isSelected: !current } : s))
    );

    try {
      const res = await fetch(`/api/coordinator/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSelected: !current }),
      });
      if (!res.ok) {
        // Revert on failure
        setSubmissions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isSelected: current } : s))
        );
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Failed to update selection.");
      }
    } catch {
      // Revert on failure
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isSelected: current } : s))
      );
      toast.error("Failed to update selection.");
    }
  }

  async function handleSaveReviewStatus(
    id: string,
    currentStatus: string,
    nextStatus: "REVIEWING"
  ) {
    if (currentStatus !== "PENDING") return;
    setReviewStatusSaving(true);
    try {
      const res = await fetch(`/api/coordinator/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: nextStatus }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Failed to update review status.");
        return;
      }
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, reviewStatus: nextStatus } : s))
      );
      toast.success("Review status updated.");
    } catch {
      toast.error("Failed to update review status.");
    } finally {
      setReviewStatusSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Post comment
  // ---------------------------------------------------------------------------

  async function handlePostComment(submissionId: string) {
    if (!commentBody.trim()) return;
    setCommentPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          content: commentBody.trim(),
          parentId: replyToId ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Failed to post comment.");
        return;
      }
      setCommentBody("");
      setReplyToId(null);
      setReplyToAuthor("");
      // Immediate revalidation — don't wait for 15s poll
      await mutateComments();
      // Optimistically update reviewStatus to COMMENTED
      if (selectedSubmissionId) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmissionId
              ? { ...s, reviewStatus: "COMMENTED", commentCount: s.commentCount + 1 }
              : s
          )
        );
      }
    } catch {
      toast.error("Failed to post comment.");
    } finally {
      setCommentPosting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Panel close handler
  // ---------------------------------------------------------------------------

  function handlePanelOpenChange(open: boolean) {
    if (!open) {
      setSelectedSubmissionId(null);
      setCommentBody("");
      setReplyToId(null);
      setReplyToAuthor("");
    }
  }

  // ---------------------------------------------------------------------------
  // Page size change handler (resets to page 1)
  // ---------------------------------------------------------------------------

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  // ---------------------------------------------------------------------------
  // Open panel
  // ---------------------------------------------------------------------------

  function handleOpenPanel(submission: SubmissionRow) {
    setSelectedSubmissionId(submission.id);
  }

  // ---------------------------------------------------------------------------
  // File download click handler (gates comment UI)
  // ---------------------------------------------------------------------------

  async function handleFileDownload(
    submissionId: string,
    fileUrl: string,
    filename: string
  ) {
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) {
        throw new Error(`Failed to download file: ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(objectUrl);

      if (!downloadedSubmissionsRef.current.has(submissionId)) {
        downloadedSubmissionsRef.current.add(submissionId);
        setDownloadVersion((v) => v + 1);
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, total]);

  // ---------------------------------------------------------------------------
  // Derive hasDownloaded for the currently selected submission
  // downloadVersion is read here to ensure re-render when a file is clicked
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _dv = downloadVersion; // ensures React re-renders when downloadVersion changes
  const hasDownloaded = selectedSubmissionId
    ? downloadedSubmissionsRef.current.has(selectedSubmissionId)
    : false;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="space-y-6 text-slate-900">
      {/* Page header */}
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">Submissions</h1>
          {!loading && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {total} {total === 1 ? "submission" : "submissions"}
            </Badge>
          )}
        </div>
        <p className="text-slate-600">
          Review, comment on, and select student submissions for publication.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {/* Filters & sort */}
      {!error && (submissions.length > 0 || searchInput.trim().length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
            }}
            placeholder="Search by student or title..."
            className="w-full max-w-sm border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
          />
          <Select
            value={filterStatus}
            onValueChange={(v) => { setFilterStatus(v as typeof filterStatus); setPage(1); }}
          >
            <SelectTrigger className="w-44 border-slate-200 bg-white text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white">
              <SelectItem value="all" className="text-slate-900">All Submissions</SelectItem>
              <SelectItem value="selected" className="text-slate-900">Selected Only</SelectItem>
              <SelectItem value="not-selected" className="text-slate-900">Not Selected</SelectItem>
              <SelectItem value="no-comments" className="text-slate-900">No Comments</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => { setSortBy(v as typeof sortBy); setPage(1); }}
          >
            <SelectTrigger className="w-48 border-slate-200 bg-white text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white">
              <SelectItem value="date-desc" className="text-slate-900">Newest First</SelectItem>
              <SelectItem value="date-asc" className="text-slate-900">Oldest First</SelectItem>
              <SelectItem value="selected" className="text-slate-900">Selected First</SelectItem>
              <SelectItem value="no-comments-priority" className="text-slate-900">No Comments Priority</SelectItem>
            </SelectContent>
          </Select>

          {filterStatus !== "all" && (
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
              Filtered total: {total}
            </Badge>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[920px] w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Student</th>
                <th className="px-4 py-3 text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-sm font-medium">Submitted Date</th>
                <th className="px-4 py-3 text-sm font-medium text-center">Files</th>
                <th className="px-4 py-3 text-sm font-medium text-center">Comments</th>
                <th className="px-4 py-3 text-sm font-medium text-center">Review</th>
                <th className="px-4 py-3 text-sm font-medium text-center">Selected</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(pageSize)].map((_, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-44 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-5 rounded mx-auto" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-5 rounded mx-auto" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-16 rounded-sm mx-auto" /></td>
                  <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-16 rounded-sm mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-500">
            {search.trim()
              ? "No submissions match your search."
              : "No submitted work from your faculty yet."}
          </p>
        </div>
      )}

      {/* Submissions table */}
      {!loading && !error && submissions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[920px] w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Student</th>
                <th className="px-4 py-3 text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-sm font-medium">
                  Submitted Date
                </th>
                <th className="px-4 py-3 text-sm font-medium text-center">
                  Files
                </th>
                <th className="px-4 py-3 text-sm font-medium text-center">
                  Comments
                </th>
                <th className="px-4 py-3 text-sm font-medium text-center">
                  Review
                </th>
                <th className="px-4 py-3 text-sm font-medium text-center">
                  Selected
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr
                  key={submission.id}
                  className="cursor-pointer border-t border-slate-200 text-slate-900 hover:bg-slate-50"
                  onClick={() => handleOpenPanel(submission)}
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {submission.studentName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {submission.title ?? (
                      <span className="italic text-slate-400">Untitled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatSubmittedDate(submission.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-700">
                    {submission.fileCount}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-700">
                    {submission.commentCount === 0 ? (
                      <span className="text-amber-600 font-medium">0</span>
                    ) : (
                      submission.commentCount
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {submission.reviewStatus === "COMMENTED" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Commented</Badge>
                    ) : submission.reviewStatus === "REVIEWING" ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">Reviewing</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">Pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {submission.isSelected ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        Selected
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {!loading && !error && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Slide-over panel */}
      <Sheet
        open={!!selectedSubmissionId}
        onOpenChange={handlePanelOpenChange}
      >
        <SheetContent
          side="right"
          className="w-[480px] sm:max-w-[560px] overflow-y-auto p-0 flex flex-col"
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
                    {selectedSubmission.studentName ?? "Unknown student"}
                  </SheetDescription>
                </SheetHeader>

                {/* isSelected toggle */}
                <div className="flex items-center gap-3 px-5 pb-4">
                  <Switch
                    id="is-selected-toggle"
                    checked={selectedSubmission.isSelected}
                    disabled={selectedSubmission.reviewStatus === "PENDING"}
                    onCheckedChange={() => {
                      if (selectedSubmission.reviewStatus === "PENDING") return;
                      setConfirmDialog({
                        open: true,
                        submissionId: selectedSubmission.id,
                        currentSelected: selectedSubmission.isSelected,
                        title: selectedSubmission.title,
                      });
                    }}
                  />
                  <Label
                    htmlFor="is-selected-toggle"
                    className="cursor-pointer text-sm text-slate-700"
                  >
                    Selected for Publication
                  </Label>
                </div>

                <div className="space-y-2 px-5 pb-4">
                  <Label className="text-sm font-medium text-slate-700">
                    Status
                  </Label>
                  <p className="text-sm text-slate-500">
                    {selectedSubmission.reviewStatus === "PENDING"
                      ? "Pending"
                      : selectedSubmission.reviewStatus === "REVIEWING"
                        ? "Reviewing"
                        : "Commented"}
                  </p>
                  {selectedSubmission.reviewStatus === "PENDING" && (
                    <button
                      type="button"
                      disabled={reviewStatusSaving}
                      onClick={() =>
                        setReviewConfirmDialog({
                          open: true,
                          submissionId: selectedSubmission.id,
                          currentStatus: selectedSubmission.reviewStatus,
                        })
                      }
                      className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      {reviewStatusSaving ? "Updating..." : "Mark as Reviewing"}
                    </button>
                  )}
                </div>

                <div className="space-y-2 px-5 pb-5">
                  <Label className="text-sm font-medium text-slate-700">
                    Notes
                  </Label>
                  <div className="min-h-20 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedSubmission.notes?.trim() || "No notes available."}
                  </div>
                </div>

              </div>

              {/* Uploaded files */}
              {(selectedSubmission.files?.length ?? 0) > 0 && (
                <div className="border-b border-slate-200 px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Files ({selectedSubmission.files.length})
                  </p>
                  <ul className="space-y-1.5">
                    {selectedSubmission.files.map((file) => (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() =>
                            handleFileDownload(
                              selectedSubmission.id,
                              file.url,
                              file.filename
                            )
                          }
                          className="flex w-full items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors text-left"
                        >
                          <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="flex-1 truncate">{file.filename}</span>
                          {file.size !== null && (
                            <span className="shrink-0 text-xs text-slate-400">
                              {formatFileSize(file.size)}
                            </span>
                          )}
                          <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Comment thread */}
              <div className="flex flex-1 flex-col overflow-y-auto">
                <div className="border-b border-slate-100 px-5 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Comments
                  </p>
                </div>

                {/* Comment list */}
                <div className="flex-1 space-y-4 px-5 py-4">
                  {comments.length === 0 && (
                    <p className="text-sm text-slate-400">
                      No comments yet. Be the first to start the conversation.
                    </p>
                  )}
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={comment.parentId ? "ml-6 border-l-2 border-slate-200 pl-3" : ""}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {comment.author.name ?? "Unknown"}
                        </span>
                        <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          {formatRole(comment.author.role)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatCommentTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">
                        {comment.body}
                      </p>
                      {/* Reply link — sets parentId for next comment */}
                      <button
                        type="button"
                        className="mt-1 text-xs text-slate-400 hover:text-slate-600 underline"
                        onClick={() => {
                          setReplyToId(comment.id);
                          setReplyToAuthor(comment.author.name ?? "this comment");
                        }}
                      >
                        Reply
                      </button>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <div className="sticky bottom-0 border-t border-slate-200 bg-white px-5 py-4 space-y-2">
                  {replyToId && (
                    <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                      <span>
                        Replying to{" "}
                        <span className="font-medium">{replyToAuthor}</span>
                      </span>
                      <button
                        type="button"
                        className="ml-2 text-slate-400 hover:text-slate-600"
                        onClick={() => {
                          setReplyToId(null);
                          setReplyToAuthor("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <textarea
                    rows={2}
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    disabled={!hasDownloaded}
                    placeholder={
                      hasDownloaded
                        ? "Write a comment..."
                        : "Download at least one file before commenting..."
                    }
                    className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && hasDownloaded) {
                        e.preventDefault();
                        handlePostComment(selectedSubmission.id);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {hasDownloaded ? "Ctrl+Enter to send" : "Download a file to enable commenting"}
                    </span>
                    <button
                      type="button"
                      disabled={commentPosting || !commentBody.trim() || !hasDownloaded}
                      onClick={() => handlePostComment(selectedSubmission.id)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {commentPosting ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Selection confirmation dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog((prev) => ({ ...prev, open: false }));
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.currentSelected
                ? "Remove from Selection"
                : "Select for Publication"}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {confirmDialog.currentSelected ? (
                <>
                  Are you sure you want to remove{" "}
                  <span className="font-medium text-slate-900">
                    {confirmDialog.title ?? "this submission"}
                  </span>{" "}
                  from the selected publications?
                </>
              ) : (
                <>
                  Are you sure you want to select{" "}
                  <span className="font-medium text-slate-900">
                    {confirmDialog.title ?? "this submission"}
                  </span>{" "}
                  for publication?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              className={
                confirmDialog.currentSelected
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }
              onClick={() => {
                handleToggleSelected(
                  confirmDialog.submissionId,
                  confirmDialog.currentSelected
                );
                toast.success(
                  confirmDialog.currentSelected
                    ? "Submission removed from selection."
                    : "Submission selected for publication."
                );
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              {confirmDialog.currentSelected ? "Remove" : "Confirm Selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={reviewConfirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setReviewConfirmDialog((prev) => ({ ...prev, open: false }));
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Review Status</DialogTitle>
            <DialogDescription className="text-slate-600">
              Do you want to update the status?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setReviewConfirmDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={reviewStatusSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={reviewStatusSaving}
              onClick={() => {
                handleSaveReviewStatus(
                  reviewConfirmDialog.submissionId,
                  reviewConfirmDialog.currentStatus,
                  "REVIEWING"
                );
                setReviewConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              {reviewStatusSaving ? "Updating..." : "Mark as Reviewing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
