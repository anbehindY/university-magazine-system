"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubmissionRow = {
  id: string;
  title: string | null;
  status: string;
  studentName: string | null;
  submittedAt: string | null;
  isSelected: boolean;
  notes: string | null;
  fileCount: number;
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

  // Notes editing state
  const [notesValue, setNotesValue] = useState<string>("");
  const [notesSaving, setNotesSaving] = useState(false);

  // Comment compose state
  const [commentBody, setCommentBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToAuthor, setReplyToAuthor] = useState<string>("");
  const [commentPosting, setCommentPosting] = useState(false);

  // ---------------------------------------------------------------------------
  // Load submissions on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function fetchSubmissions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/coordinator/submissions");
        const data = (await res.json()) as {
          submissions?: SubmissionRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load submissions.");
          setSubmissions([]);
          return;
        }
        setSubmissions(data.submissions ?? []);
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
  }, []);

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

  // Sync notes textarea when panel opens/switches submission
  useEffect(() => {
    if (selectedSubmission) {
      setNotesValue(selectedSubmission.notes ?? "");
    }
  }, [selectedSubmission?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ---------------------------------------------------------------------------
  // Notes save
  // ---------------------------------------------------------------------------

  async function handleSaveNotes(id: string) {
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/coordinator/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(data?.error ?? "Failed to save notes.");
        return;
      }
      // Update local state
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, notes: notesValue } : s
        )
      );
      toast.success("Notes saved.");
    } catch {
      toast.error("Failed to save notes.");
    } finally {
      setNotesSaving(false);
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
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-4 pb-6 text-slate-900 sm:px-6">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Submissions</h1>
        <p className="text-slate-600">
          Review, comment on, and select student submissions for publication.
        </p>
      </header>

      <div className="border-t border-slate-200" />

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
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
            No submitted work from your faculty yet.
          </p>
        </div>
      )}

      {/* Submissions table */}
      {!loading && !error && submissions.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
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
                  Selected
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr
                  key={submission.id}
                  className="cursor-pointer border-t border-slate-200 text-slate-900 hover:bg-slate-50"
                  onClick={() => setSelectedSubmissionId(submission.id)}
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
                    onCheckedChange={() =>
                      handleToggleSelected(
                        selectedSubmission.id,
                        selectedSubmission.isSelected
                      )
                    }
                  />
                  <Label
                    htmlFor="is-selected-toggle"
                    className="cursor-pointer text-sm text-slate-700"
                  >
                    Selected for Publication
                  </Label>
                </div>

                {/* Notes textarea */}
                <div className="space-y-2 px-5 pb-5">
                  <Label
                    htmlFor="notes-field"
                    className="text-sm font-medium text-slate-700"
                  >
                    Notes
                  </Label>
                  <textarea
                    id="notes-field"
                    rows={3}
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add internal notes about this submission..."
                    className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={notesSaving}
                      onClick={() => handleSaveNotes(selectedSubmission.id)}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {notesSaving ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                </div>
              </div>

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
                    placeholder="Write a comment..."
                    className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handlePostComment(selectedSubmission.id);
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Ctrl+Enter to send
                    </span>
                    <button
                      type="button"
                      disabled={commentPosting || !commentBody.trim()}
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
    </main>
  );
}
