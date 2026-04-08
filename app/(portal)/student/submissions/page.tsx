"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Info, MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

const DRAFT_STORAGE_KEY = "studentSubmissionDraft";

// ---------------------------------------------------------------------------
// Comment thread helpers
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatRole(role: string | null) {
  if (!role) return "";
  switch (role) {
    case "MARKETING_COORDINATOR": return "Coordinator";
    case "STUDENT": return "Student";
    default: return role;
  }
}

function formatCommentTime(value: string) {
  try {
    return format(new Date(value), "dd MMM yyyy, HH:mm");
  } catch {
    return value;
  }
}

type Comment = {
  id: string;
  body: string;
  authorRole: string;
  parentId: string | null;
  createdAt: string;
  author: { name: string | null; role: string | null };
};

type UploadConfig = {
  enableUploads: boolean;
  maxUploadSizeMb: number;
  maxFilesPerUpload: number;
  allowedFileTypes: string[]; // uppercase: ["DOC", "DOCX", "PNG"]
};

function validateFiles(
  newFiles: File[],
  existingCount: number,
  config: { maxFilesPerUpload: number; maxUploadSizeMb: number; allowedFileTypes: string[] }
): string | null {
  const totalCount = existingCount + newFiles.length;
  if (totalCount > config.maxFilesPerUpload) {
    return `Maximum ${config.maxFilesPerUpload} files per submission.`;
  }
  for (const file of newFiles) {
    if (file.size > config.maxUploadSizeMb * 1024 * 1024) {
      return `"${file.name}" exceeds the ${config.maxUploadSizeMb}MB limit.`;
    }
    const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
    if (config.allowedFileTypes.length > 0 && !config.allowedFileTypes.includes(ext)) {
      const extList = config.allowedFileTypes.map((e) => `.${e.toLowerCase()}`).join(", ");
      return `Only ${extList} files are allowed.`;
    }
  }
  return null;
}

function mergeSelectedFiles(existingFiles: File[], incomingFiles: File[]) {
  const seen = new Set(existingFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  const merged = [...existingFiles];
  for (const file of incomingFiles) {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(file);
  }
  return merged;
}

function SubmissionCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-sm" />
      </div>
      <Skeleton className="h-3 w-20" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export default function StudentSubmissionsPage() {
  const { data: session, isPending } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [notes, setNotes] = useState("");
  const [previewOverview, setPreviewOverview] = useState("");
  const [previewContentTitles, setPreviewContentTitles] = useState<string[]>([]);
  const [contentTitleInput, setContentTitleInput] = useState("");
  const [editingContentTitleIndex, setEditingContentTitleIndex] = useState<number | null>(null);
  const [draftFileNames, setDraftFileNames] = useState<string[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(null);
  const [firstClosureDate, setFirstClosureDate] = useState<string | null>(null);
  const [finalClosureDate, setFinalClosureDate] = useState<string | null>(null);
  const [closureYearLabel, setClosureYearLabel] = useState<string | null>(null);
  const [closureLoading, setClosureLoading] = useState(true);
  const [closureError, setClosureError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedBlobs, setUploadedBlobs] = useState<
    {
      url: string;
      pathname: string;
      contentType?: string | null;
      size?: number | null;
    }[]
  >([]);
  const [submissions, setSubmissions] = useState<
    {
      id: string;
      status: "DRAFT" | "SUBMITTED";
      title: string | null;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
      submittedAt: string | null;
      commentCount: number;
      reviewStatus: string;
      preview: { overview: string | null; contentTitles: string[] };
      academicYearId: string | null;
      academicYear: { id: string; yearLabel: string; isActive: boolean } | null;
      files: { id: string; url: string; pathname: string; createdAt: string }[];
    }[]
  >([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(
    null
  );
  const [editingStatus, setEditingStatus] = useState<"DRAFT" | "SUBMITTED" | null>(
    null
  );
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const isBusy = isUploading || isSavingDraft;
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    status: "DRAFT" | "SUBMITTED";
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCommentSubmissionId, setSelectedCommentSubmissionId] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToAuthor, setReplyToAuthor] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingFiles, setEditingFiles] = useState<
    { id: string; url: string; pathname: string }[]
  >([]);

  // Closure state derived from both dates and the current dialog mode.
  // New submissions are blocked after firstClosureDate (CLOS-01).
  // Editing existing submissions is blocked after finalClosureDate (CLOS-02).
  const pastFirst = !!firstClosureDate && Date.now() > new Date(firstClosureDate).setHours(23, 59, 59, 999);
  const pastFinal = !!finalClosureDate && Date.now() > new Date(finalClosureDate).setHours(23, 59, 59, 999);
  const isClosed = editingSubmissionId ? pastFinal : pastFirst;

  // Split submissions into current-year (editable) and archived (read-only)
  const currentSubmissions = submissions.filter(
    (s) => s.academicYear?.isActive === true
  );

  const archivedByYear = submissions
    .filter((s) => s.academicYear?.isActive !== true)
    .reduce<Record<string, typeof submissions>>((groups, s) => {
      const label = s.academicYear?.yearLabel ?? "Unknown Year";
      if (!groups[label]) groups[label] = [];
      groups[label].push(s);
      return groups;
    }, {});

  const archivedYearLabels = Object.keys(archivedByYear).sort().reverse();
  const hasArchived = archivedYearLabels.length > 0;

  function getReviewBadge(reviewStatus: string) {
    switch (reviewStatus) {
      case "COMMENTED":
        return { label: "Commented", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      case "REVIEWING":
        return { label: "Reviewing", className: "bg-blue-100 text-blue-800 border-blue-200" };
      default:
        return { label: "Pending", className: "bg-slate-100 text-slate-600 border-slate-200" };
    }
  }

  function getStatusBadgeClass(status: "DRAFT" | "SUBMITTED") {
    if (status === "SUBMITTED") {
      return "bg-emerald-100 text-emerald-900 border border-emerald-200";
    }
    return "bg-amber-100 text-amber-900 border border-amber-200";
  }

  function getFileName(pathname: string) {
    const trimmed = pathname.trim();
    const parts = trimmed.split("/");
    return parts[parts.length - 1] || trimmed;
  }

  // ---------------------------------------------------------------------------
  // SWR upload config
  // ---------------------------------------------------------------------------

  const { data: uploadConfig } = useSWR<UploadConfig>(
    "/api/config/upload-rules",
    fetcher
  );

  // Derived from config — safe defaults while loading (permissive, server is authoritative gate)
  const uploadsEnabled = uploadConfig?.enableUploads ?? true;
  const maxSizeMb = uploadConfig?.maxUploadSizeMb ?? 25;
  const maxFiles = uploadConfig?.maxFilesPerUpload ?? 10;
  const allowedExts = uploadConfig?.allowedFileTypes ?? ["DOC", "DOCX"];

  // accept attribute: ".doc,.docx" (lowercase, dot-prefixed)
  const acceptAttr = allowedExts.map((ext) => `.${ext.toLowerCase()}`).join(",");

  // hint text: "Accepted: .doc, .docx · Max 10MB · Up to 5 files"
  const uploadHintText = uploadConfig
    ? `Accepted: ${allowedExts.map((e) => `.${e.toLowerCase()}`).join(", ")} · Max ${maxSizeMb}MB · Up to ${maxFiles} files`
    : "Loading upload rules...";

  // ---------------------------------------------------------------------------
  // SWR comment thread (polls every 15 s)
  // ---------------------------------------------------------------------------

  const { data: commentsData, mutate: mutateComments } = useSWR(
    selectedCommentSubmissionId
      ? `/api/comments?submissionId=${selectedCommentSubmissionId}`
      : null,
    fetcher,
    { refreshInterval: 15000 }
  );

  const comments: Comment[] = commentsData?.comments ?? [];

  // Derived: selected submission details for panel header
  const selectedSubmission = selectedCommentSubmissionId
    ? submissions.find((s) => s.id === selectedCommentSubmissionId) ?? null
    : null;

  const isArchivedYear = selectedSubmission !== null && selectedSubmission?.academicYear?.isActive !== true;
  const isLocked: boolean = (commentsData?.isLocked ?? false) || isArchivedYear;

  function handleCommentPanelClose(open: boolean) {
    if (!open) {
      setSelectedCommentSubmissionId(null);
      setCommentBody("");
      setReplyToId(null);
      setReplyToAuthor("");
    }
  }

  async function handlePostReply() {
    if (!commentBody.trim() || !selectedCommentSubmissionId || !replyToId) return;
    setCommentPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedCommentSubmissionId,
          content: commentBody.trim(),
          parentId: replyToId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "Failed to post reply.");
        return;
      }
      setCommentBody("");
      setReplyToId(null);
      setReplyToAuthor("");
      await mutateComments();
      toast.success("Reply posted.");
    } catch {
      toast.error("Failed to post reply.");
    } finally {
      setCommentPosting(false);
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        agreed?: boolean;
        title?: string;
        notes?: string;
        previewOverview?: string;
        previewContentTitles?: string[] | string;
        fileNames?: string[];
        savedAt?: string;
        submissionId?: string;
      };
      const restoredContentTitles = Array.isArray(parsed.previewContentTitles)
        ? parsed.previewContentTitles
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : typeof parsed.previewContentTitles === "string"
          ? parsed.previewContentTitles
              .split("\n")
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
          : [];
      setAgreed(Boolean(parsed.agreed));
      setTitle(parsed.title ?? "");
      setNotes(parsed.notes ?? "");
      setPreviewOverview(parsed.previewOverview ?? "");
      setPreviewContentTitles(restoredContentTitles);
      setDraftFileNames(Array.isArray(parsed.fileNames) ? parsed.fileNames : []);
      setDraftSavedAt(parsed.savedAt ?? null);
      setDraftSubmissionId(parsed.submissionId ?? null);
    } catch {
      // Ignore malformed drafts.
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadClosureDate() {
      try {
        setClosureLoading(true);
        const response = await fetch("/api/academic-years");
        if (!response.ok) {
          throw new Error("Failed to load closure date.");
        }
        const payload = (await response.json()) as {
          academicYear?: { yearLabel?: string | null; firstClosureDate?: string | null; finalClosureDate?: string | null; endDate?: string | null };
        };
        if (!isMounted) return;

        setFirstClosureDate(payload.academicYear?.firstClosureDate ?? payload.academicYear?.endDate ?? null);
        setFinalClosureDate(payload.academicYear?.finalClosureDate ?? null);
        setClosureYearLabel(payload.academicYear?.yearLabel ?? null);
      } catch (error) {
        if (!isMounted) return;
        setClosureError(error instanceof Error ? error.message : "Failed to load closure date.");
      } finally {
        if (isMounted) setClosureLoading(false);
      }
    }

    loadClosureDate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isPending || !session?.user) return;
    void loadSubmissions();
  }, [isPending, session?.user?.id]);

  function resetSubmissionForm() {
    setAgreed(false);
    setFiles([]);
    setTitle("");
    setNotes("");
    setPreviewOverview("");
    setPreviewContentTitles([]);
    setContentTitleInput("");
    setEditingContentTitleIndex(null);
    setDraftFileNames([]);
    setDraftSavedAt(null);
    setDraftSubmissionId(null);
    setEditingSubmissionId(null);
    setEditingStatus(null);
    setIsUploading(false);
    setUploadProgress({});
    setUploadedBlobs([]);
    setEditingFiles([]);
  }

  function startEditSubmission(submission: {
    id: string;
    status: "DRAFT" | "SUBMITTED";
    title: string | null;
    notes: string | null;
    preview: { overview: string | null; contentTitles: string[] };
    files: { id: string; url: string; pathname: string; createdAt: string }[];
    updatedAt: string;
  }) {
    setEditingSubmissionId(submission.id);
    setEditingStatus(submission.status);
    setDraftSubmissionId(submission.id);
    setTitle(submission.title ?? "");
    setNotes(submission.notes ?? "");
    setPreviewOverview(submission.preview?.overview ?? "");
    setPreviewContentTitles(submission.preview?.contentTitles ?? []);
    setContentTitleInput("");
    setEditingContentTitleIndex(null);
    setAgreed(true);
    setFiles([]);
    setDraftFileNames(submission.files.map((file) => file.pathname));
    setDraftSavedAt(submission.updatedAt ?? null);
    setEditingFiles(
      submission.files.map((file) => ({
        id: file.id,
        url: file.url,
        pathname: file.pathname,
      }))
    );
    setUploadedBlobs([]);
    setIsDialogOpen(true);
  }

  function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    const merged = mergeSelectedFiles(files, selected);
    const error = validateFiles(
      merged,
      editingFiles.length + uploadedBlobs.length,
      { maxFilesPerUpload: maxFiles, maxUploadSizeMb: maxSizeMb, allowedFileTypes: allowedExts }
    );
    if (error) {
      toast.error(error);
      return;
    }
    setFiles(merged);
  }

  function onDropFiles(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (isClosed || isBusy || !uploadsEnabled) return;
    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (dropped.length === 0) return;
    const merged = mergeSelectedFiles(files, dropped);
    const error = validateFiles(
      merged,
      editingFiles.length + uploadedBlobs.length,
      { maxFilesPerUpload: maxFiles, maxUploadSizeMb: maxSizeMb, allowedFileTypes: allowedExts }
    );
    if (error) {
      toast.error(error);
      setIsDragging(false);
      return;
    }
    setFiles(merged);
    setIsDragging(false);
  }

  function removeFileAt(index: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  function addOrUpdateContentTitle() {
    const value = contentTitleInput.trim();
    if (!value) return;
    if (editingContentTitleIndex !== null) {
      setPreviewContentTitles((prev) =>
        prev.map((item, index) =>
          index === editingContentTitleIndex ? value : item
        )
      );
      setEditingContentTitleIndex(null);
      setContentTitleInput("");
      return;
    }
    setPreviewContentTitles((prev) => [...prev, value]);
    setContentTitleInput("");
  }

  function editContentTitle(index: number) {
    setContentTitleInput(previewContentTitles[index] ?? "");
    setEditingContentTitleIndex(index);
  }

  function deleteContentTitle(index: number) {
    setPreviewContentTitles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    if (editingContentTitleIndex === null) return;
    if (editingContentTitleIndex === index) {
      setEditingContentTitleIndex(null);
      setContentTitleInput("");
      return;
    }
    if (editingContentTitleIndex > index) {
      setEditingContentTitleIndex((prev) => (prev === null ? null : prev - 1));
    }
  }

  function cancelContentTitleEdit() {
    setEditingContentTitleIndex(null);
    setContentTitleInput("");
  }

  async function loadSubmissions() {
    try {
      setSubmissionsLoading(true);
      setSubmissionsError("");
      const response = await fetch("/api/submissions");
      if (!response.ok) {
        throw new Error("Failed to load submissions.");
      }
      const payload = (await response.json()) as {
        submissions: {
          id: string;
          status: "DRAFT" | "SUBMITTED";
          title: string | null;
          notes: string | null;
          preview: { overview: string | null; contentTitles: string[] };
          createdAt: string;
          updatedAt: string;
          submittedAt: string | null;
          commentCount: number;
          reviewStatus: string;
          academicYearId: string | null;
          academicYear: { id: string; yearLabel: string; isActive: boolean } | null;
          files: { id: string; url: string; pathname: string; createdAt: string }[];
        }[];
      };
      setSubmissions(payload.submissions ?? []);
    } catch (error) {
      setSubmissionsError(
        error instanceof Error ? error.message : "Failed to load submissions."
      );
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function saveDraftToDb(
    nextStatus: "DRAFT" | "SUBMITTED",
    submissionIdOverride?: string,
    forceCreate?: boolean
  ) {
    if (!session?.user || isPending) {
      throw new Error("Please sign in to save your draft.");
    }

    const targetId = submissionIdOverride ?? draftSubmissionId;
    const shouldCreate = forceCreate || !targetId;
    const response = await fetch("/api/submissions", {
      method: shouldCreate ? "POST" : "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: shouldCreate ? undefined : targetId ?? undefined,
        agreed,
        title: title || null,
        notes,
        previewOverview,
        previewContentTitles,
        status: nextStatus,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Failed to save draft.");
    }

    const payload = (await response.json()) as {
      submission: { id: string };
    };
    setDraftSubmissionId(payload.submission.id);
    await loadSubmissions();
    return payload.submission.id;
  }

  async function onSaveDraft() {
    if (isClosed) {
      toast.error("Editing is closed for this submission period.");
      return;
    }
    try {
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("Please sign in to submit your files.");
      }

      const nextStatus =
        editingSubmissionId && editingStatus === "SUBMITTED" ? "SUBMITTED" : "DRAFT";
      setIsSavingDraft(true);
      const toastId = toast.loading("Saving draft...");
      const submissionId = await saveDraftToDb(
        nextStatus,
        editingSubmissionId ?? undefined,
        !editingSubmissionId
      );
      const savedAt = new Date().toISOString();
      const fileNames = files.length > 0 ? files.map((file) => file.name) : draftFileNames;
      setDraftFileNames(fileNames);
      setDraftSavedAt(savedAt);
      setDraftSubmissionId(submissionId);
      window.localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          agreed,
          title,
          notes,
          previewOverview,
          previewContentTitles,
          fileNames,
          savedAt,
          submissionId,
        })
      );
      if (files.length > 0) {
        const uploads = await Promise.all(
          files.map((file) =>
            upload(`submissions/${userId}/${submissionId}/${file.name}`, file, {
              access: "public",
              handleUploadUrl: "/api/submissions/upload",
              clientPayload: JSON.stringify({
                userId,
                originalName: file.name,
                submissionId,
              }),
            })
          )
        );

        setUploadedBlobs((prev) => [...prev, ...uploads]);
        await fetch("/api/submissions/files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId,
            files: uploads.map((blob, index) => ({
              url: blob.url,
              pathname: blob.pathname,
              contentType: blob.contentType ?? null,
              size: files[index]?.size ?? null,
            })),
          }),
        });
      }

      await loadSubmissions();
      toast.success(editingSubmissionId ? "Changes saved." : "Draft saved.", {
        id: toastId,
      });
      setIsDialogOpen(false);
    } catch {
      toast.error("Unable to save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  }

  function onClearDraft() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraftFileNames([]);
    setDraftSavedAt(null);
    setDraftSubmissionId(null);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (isClosed) {
      toast.error("Editing is closed for this submission period.");
      return;
    }

    if (!title.trim()) {
      setTitleError("Please enter a title for your submission.");
      return;
    }

    if (!agreed) {
      toast.error("You must agree to the Terms and Conditions before submitting.");
      return;
    }

    const hasExistingFiles = draftFileNames.length > 0 || uploadedBlobs.length > 0 || editingFiles.length > 0;
    if (files.length === 0 && !hasExistingFiles) {
      toast.error("Please upload at least one Word document or image.");
      return;
    }

    let toastId: string | number | undefined;
    try {
      toastId = toast.loading("Uploading your submission...");
      const userId = session?.user?.id;
      if (!userId) {
        throw new Error("Please sign in to submit your files.");
      }

      setIsUploading(true);
      setUploadProgress({});

      const submissionId = await saveDraftToDb(
        "DRAFT",
        editingSubmissionId ?? undefined,
        !editingSubmissionId
      );

      if (files.length > 0) {
        const uploads = await Promise.all(
          files.map(async (file) => {
            const fileKey = `${file.name}-${file.lastModified}`;
            return upload(`submissions/${userId}/${submissionId}/${file.name}`, file, {
              access: "public",
              handleUploadUrl: "/api/submissions/upload",
              clientPayload: JSON.stringify({
                userId,
                originalName: file.name,
                submissionId,
              }),
              onUploadProgress: (progress) => {
                setUploadProgress((prev) => ({
                  ...prev,
                  [fileKey]: progress.percentage,
                }));
              },
            });
          })
        );

        setUploadedBlobs((prev) => [...prev, ...uploads]);
        await fetch("/api/submissions/files", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId,
            files: uploads.map((blob, index) => ({
              url: blob.url,
              pathname: blob.pathname,
              contentType: blob.contentType ?? null,
              size: files[index]?.size ?? null,
            })),
          }),
        });
      }

      await saveDraftToDb("SUBMITTED", submissionId);
      toast.success("Submission uploaded successfully.", { id: toastId });
      setIsDialogOpen(false);
    } catch (error) {
      if (toastId) {
        toast.error(
          error instanceof Error ? error.message : "Upload failed. Please try again.",
          { id: toastId }
        );
      } else {
        toast.error(
          error instanceof Error ? error.message : "Upload failed. Please try again."
        );
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function onDeleteSubmission() {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const response = await fetch("/api/submissions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to delete submission.");
      }

      toast.success("Draft deleted.");
      await loadSubmissions();
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete submission."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function onDeleteFile(fileId: string) {
    try {
      const response = await fetch("/api/submissions/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: fileId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || "Failed to delete file.");
      }

      setEditingFiles((prev) => prev.filter((file) => file.id !== fileId));
      toast.success("File removed.");
      await loadSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete file.");
    }
  }

  return (
    <main className="w-full space-y-6 px-4 pt-4 pb-8 text-slate-900 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Your Submissions</h1>
        <p className="text-slate-600">
          Manage your drafts and submitted work for the university magazine.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Current Year</CardTitle>
            <CardDescription className="text-slate-500">
              Drafts and submitted entries saved to the system.
            </CardDescription>
          </div>
          {!closureLoading && closureYearLabel === null ? (
            <Alert className="border-slate-200 bg-slate-50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-slate-600">
                No active academic year. Submissions are currently closed.
              </AlertDescription>
            </Alert>
          ) : (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (isBusy) return;
              setIsDialogOpen(open);
              if (!open) resetSubmissionForm();
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-amber-400 text-slate-900 hover:bg-amber-300"
                onClick={() => resetSubmissionForm()}
              >
                New Submission
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
              showCloseButton={!isBusy}
              onEscapeKeyDown={(event) => {
                if (isBusy) event.preventDefault();
              }}
              onInteractOutside={(event) => {
                if (isBusy) event.preventDefault();
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {editingSubmissionId ? "Edit submission" : "New submission"}
                </DialogTitle>
                <DialogDescription>
                  {editingSubmissionId
                    ? "Update your files and notes before the final closure date."
                    : "Upload your files, add notes, and save a draft or submit for review."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Upload limits
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-700">
                    <span>
                      <span className="text-slate-500">Types: </span>
                      {uploadConfig
                        ? allowedExts.map((e) => `.${e.toLowerCase()}`).join(", ")
                        : "Loading…"}
                    </span>
                    <span>
                      <span className="text-slate-500">Max size: </span>
                      {uploadConfig ? `${maxSizeMb} MB` : "—"}
                    </span>
                    <span>
                      <span className="text-slate-500">Max files: </span>
                      {uploadConfig ? maxFiles : "—"}
                    </span>
                  </div>
                </div>

                <form onSubmit={onSubmit} className="space-y-6" noValidate>
                  {closureLoading ? (
                    <Alert>
                      <AlertTitle>Checking closure date</AlertTitle>
                      <AlertDescription>
                        Loading the final submission window details.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {closureError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Unable to load closure date</AlertTitle>
                      <AlertDescription>{closureError}</AlertDescription>
                    </Alert>
                  ) : null}

                  {!closureLoading && !closureError ? (
                    <Alert
                      variant={isClosed ? "destructive" : "default"}
                      className={isClosed ? "" : "border-amber-200 bg-amber-50 text-amber-900"}
                    >
                      <Info className="h-4 w-4" />
                      <AlertTitle>
                        {editingSubmissionId
                          ? isClosed ? "Editing closed" : "Final editing deadline"
                          : isClosed ? "Submissions closed" : "Submission deadline"}
                      </AlertTitle>
                      <AlertDescription className={isClosed ? "" : "text-amber-800"}>
                        {editingSubmissionId ? (
                          finalClosureDate
                            ? `Editing ${isClosed ? "closed since" : "closes on"} ${new Date(finalClosureDate).toLocaleDateString()}${closureYearLabel ? ` (${closureYearLabel})` : ""}.`
                            : "No final editing deadline has been published yet."
                        ) : (
                          firstClosureDate
                            ? `New submissions ${isClosed ? "closed since" : "close on"} ${new Date(firstClosureDate).toLocaleDateString()}${closureYearLabel ? ` (${closureYearLabel})` : ""}.`
                            : "No submission deadline has been published yet."
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {!uploadsEnabled && (
                    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Uploads disabled</AlertTitle>
                      <AlertDescription className="text-amber-800">
                        File uploads are currently disabled by the administrator.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="submission-title">Title</Label>
                    <Input
                      id="submission-title"
                      placeholder="Give your submission a title"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                      disabled={isClosed || isBusy}
                      className="selection:bg-amber-200 selection:text-slate-900"
                    />
                    {titleError && (
                      <p className="text-sm text-destructive">{titleError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submission-files">Upload files</Label>
                    <label
                      htmlFor="submission-files"
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!isClosed && !isBusy && uploadsEnabled) setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDropFiles}
                      className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                        isDragging
                          ? "border-amber-400 bg-amber-50 text-slate-900"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      } ${isClosed || isBusy || !uploadsEnabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <span className="text-sm font-medium text-slate-800">
                        Drag & drop your files here
                      </span>
                      <span className="text-xs text-slate-500">
                        or click to browse ({uploadConfig ? allowedExts.map((e) => `.${e.toLowerCase()}`).join(", ") : "…"})
                      </span>
                      <Input
                        id="submission-files"
                        type="file"
                        accept={acceptAttr}
                        multiple
                        onChange={onFilesChange}
                        disabled={isClosed || isBusy || !uploadsEnabled}
                        className="hidden"
                      />
                    </label>
                  </div>

                    {/* Existing files — always visible in edit mode */}
                    {editingFiles.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-700">
                          Previously uploaded files
                        </p>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {editingFiles.map((file) => (
                            <li
                              key={file.id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <span className="text-slate-700">
                                {getFileName(file.pathname)}
                              </span>
                              <span className="flex items-center gap-2 text-xs">
                                <a
                                  href={file.url}
                                  className="underline decoration-slate-300 underline-offset-4"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Download
                                </a>
                                <button
                                  type="button"
                                  className="text-rose-600 hover:text-rose-700"
                                  onClick={() => onDeleteFile(file.id)}
                                  disabled={isBusy}
                                >
                                  Delete
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Newly selected files to upload */}
                    {files.length > 0 && (
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700">
                            New files to upload
                          </p>
                          <span className="text-xs text-slate-500">
                            {files.length} file{files.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-700">
                          {files.map((file, index) => (
                            <li
                              key={`${file.name}-${file.lastModified}`}
                              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {file.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFileAt(index)}
                                disabled={isClosed || isBusy}
                              >
                                Remove
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Draft file names fallback (non-edit mode, draft restored from localStorage) */}
                    {!editingSubmissionId && files.length === 0 && draftFileNames.length > 0 && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-700">
                          Draft files
                        </p>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {draftFileNames.map((fileName) => (
                            <li key={fileName}>{getFileName(fileName)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  <div className="space-y-2">
                    <Label htmlFor="submission-preview-content-titles">
                      Content Title List
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="submission-preview-content-titles"
                        value={contentTitleInput}
                        onChange={(event) => setContentTitleInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          addOrUpdateContentTitle();
                        }}
                        placeholder="Enter one content title"
                        disabled={isClosed || isBusy}
                      />
                      <Button
                        type="button"
                        onClick={addOrUpdateContentTitle}
                        disabled={isClosed || isBusy || contentTitleInput.trim().length === 0}
                      >
                        {editingContentTitleIndex !== null ? "Update" : "Add"}
                      </Button>
                      {editingContentTitleIndex !== null ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelContentTitleEdit}
                          disabled={isClosed || isBusy}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                    {previewContentTitles.length > 0 ? (
                      <ul className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                        {previewContentTitles.map((item, index) => (
                          <li
                            key={`${item}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
                          >
                            <span className="break-words text-slate-800">{item}</span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => editContentTitle(index)}
                                disabled={isClosed || isBusy}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteContentTitle(index)}
                                disabled={isClosed || isBusy}
                              >
                                Delete
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      These titles appear in guest preview details.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submission-preview-overview">
                      Contribution Overview
                    </Label>
                    <textarea
                      id="submission-preview-overview"
                      className="min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      placeholder="Write a short overview for guests to preview this submission."
                      value={previewOverview}
                      onChange={(event) => setPreviewOverview(event.target.value)}
                      disabled={isClosed || isBusy}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="submission-notes">Notes</Label>
                    <textarea
                      id="submission-notes"
                      className="min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                      placeholder="Add a short summary or reminders for your draft."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={isClosed || isBusy}
                    />
                    <p className="text-xs text-slate-500">
                      Notes are saved with your draft to help you finish later.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-slate-900"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        disabled={isClosed || isBusy}
                      />
                      <span>
                        I agree to the Terms and Conditions for submitting to the
                        university magazine.
                      </span>
                    </label>
                  </div>

                  {uploadedBlobs.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">
                        Uploaded files
                      </p>
                      <ul className="space-y-1 text-sm text-slate-600">
                        {uploadedBlobs.map((blob) => (
                          <li key={blob.url}>
                            {getFileName(blob.pathname)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {isUploading ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">
                        Uploading...
                      </p>
                      <ul className="space-y-1 text-sm text-slate-600">
                        {files.map((file) => {
                          const key = `${file.name}-${file.lastModified}`;
                          const progress = uploadProgress[key] ?? 0;
                          return (
                            <li key={key}>
                              {file.name} — {progress.toFixed(0)}%
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  {isSavingDraft ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-700">
                        Saving draft...
                      </p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {editingSubmissionId && editingStatus === "SUBMITTED" ? null : (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={onSaveDraft}
                        disabled={isClosed || isBusy}
                      >
                        {isSavingDraft
                          ? "Saving..."
                          : editingSubmissionId
                            ? "Save Changes"
                            : "Save Draft"}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="bg-amber-400 text-slate-900 hover:bg-amber-300"
                      disabled={
                        !agreed ||
                        (files.length === 0 &&
                          draftFileNames.length === 0 &&
                          uploadedBlobs.length === 0 &&
                          editingFiles.length === 0) ||
                        isClosed ||
                        isBusy ||
                        !uploadsEnabled
                      }
                    >
                      {isUploading
                        ? "Uploading..."
                        : editingSubmissionId && editingStatus === "SUBMITTED"
                          ? "Resubmit"
                          : "Submit for Review"}
                    </Button>
                  </div>
                  </form>
              </div>
            </DialogContent>
          </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {submissionsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SubmissionCardSkeleton />
              <SubmissionCardSkeleton />
            </div>
          ) : null}

          {submissionsError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load submissions</AlertTitle>
              <AlertDescription>{submissionsError}</AlertDescription>
            </Alert>
          ) : null}

          {!submissionsLoading && !submissionsError && currentSubmissions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No submissions for the current academic year.
            </p>
          ) : null}

          {!submissionsLoading && !submissionsError && currentSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {currentSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {submission.title ? submission.title : <span className="text-slate-400">Untitled</span>}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {submission.submittedAt
                          ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`
                          : "Not submitted"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        className={getStatusBadgeClass(submission.status)}
                        variant="secondary"
                      >
                        {submission.status}
                      </Badge>
                      {submission.status === "SUBMITTED" && (() => {
                        const rb = getReviewBadge(submission.reviewStatus);
                        return <Badge className={rb.className} variant="secondary">{rb.label}</Badge>;
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>
                      {submission.files.length} file{submission.files.length === 1 ? "" : "s"}
                    </span>
                    {submission.files.length > 0 && (
                      <>
                        {submission.files.slice(0, 2).map((file) => (
                          <span key={file.id} className="truncate max-w-[120px] text-slate-400">
                            {getFileName(file.pathname)}
                          </span>
                        ))}
                        {submission.files.length > 2 && (
                          <span className="text-slate-400">+{submission.files.length - 2} more</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => startEditSubmission(submission)}
                      disabled={isClosed}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedCommentSubmissionId(submission.id)}
                    >
                      <MessageSquare className="size-3.5" />
                      Comments
                      {submission.commentCount > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5">
                          {submission.commentCount}
                        </span>
                      )}
                    </Button>
                    {submission.status === "DRAFT" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDeleteTarget({
                            id: submission.id,
                            status: submission.status,
                          })
                        }
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {hasArchived && !submissionsLoading && (
        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Previous Submissions</CardTitle>
            <CardDescription className="text-slate-500">
              Read-only archive of submissions from past academic years.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {archivedYearLabels.map((yearLabel) => (
              <div key={yearLabel} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">{yearLabel}</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {archivedByYear[yearLabel].map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {submission.title || <span className="text-slate-400">Untitled</span>}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {submission.submittedAt
                              ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`
                              : "Not submitted"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={getStatusBadgeClass(submission.status)} variant="secondary">
                            {submission.status}
                          </Badge>
                          {submission.status === "SUBMITTED" && (() => {
                            const rb = getReviewBadge(submission.reviewStatus);
                            return <Badge className={rb.className} variant="secondary">{rb.label}</Badge>;
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{submission.files.length} file{submission.files.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedCommentSubmissionId(submission.id)}
                        >
                          <MessageSquare className="size-3.5" />
                          Comments
                          {submission.commentCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5">
                              {submission.commentCount}
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!isDeleting}
          onEscapeKeyDown={(event) => {
            if (isDeleting) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (isDeleting) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete submission</DialogTitle>
            <DialogDescription>
              This draft will be permanently deleted. You cannot undo this action.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-500 text-white hover:bg-rose-400"
              onClick={onDeleteSubmission}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comment thread slide-over panel */}
      <Sheet open={!!selectedCommentSubmissionId} onOpenChange={handleCommentPanelClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="sticky top-0 bg-white z-10 pb-3 border-b border-slate-200">
            <SheetTitle>Comments</SheetTitle>
            {selectedSubmission && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-900">{selectedSubmission.title || "Untitled"}</p>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadgeClass(selectedSubmission.status)} variant="secondary">
                    {selectedSubmission.status}
                  </Badge>
                  {selectedSubmission.status === "SUBMITTED" && (() => {
                    const rb = getReviewBadge(selectedSubmission.reviewStatus);
                    return <Badge className={rb.className} variant="secondary">{rb.label}</Badge>;
                  })()}
                  {selectedSubmission.submittedAt && (
                    <span className="text-xs text-slate-500">
                      Submitted {new Date(selectedSubmission.submittedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {selectedSubmission.files.length > 0 && (
                  <div className="text-xs text-slate-500">
                    {selectedSubmission.files.length} file{selectedSubmission.files.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="mt-4 space-y-4 px-4 pb-4">
            {/* Comments thread */}
            {!commentsData ? (
              /* Loading skeleton */
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 w-24 rounded bg-slate-200" />
                    <div className="h-4 w-full rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              /* Empty state */
              <p className="text-sm text-slate-500 py-8 text-center">
                Your coordinator hasn&apos;t commented yet. Comments will appear here when they do.
              </p>
            ) : (
              /* Comment list */
              <div className="space-y-4">
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
                    <p className="mt-1 text-sm text-slate-700">{comment.body}</p>
                    {/* Reply button — hidden when isLocked */}
                    {!isLocked && (
                      <button
                        type="button"
                        className="mt-1 text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
                        onClick={() => {
                          setReplyToId(comment.id);
                          setReplyToAuthor(comment.author.name ?? "this comment");
                        }}
                      >
                        Reply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Amber closure banner — shown when isLocked */}
            {isLocked && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertDescription className="text-amber-800">
                  {isArchivedYear
                    ? "Comments are locked — this submission belongs to a past academic year."
                    : "Comments are locked — the final closure date has passed."}
                </AlertDescription>
              </Alert>
            )}

            {/* Reply input — hidden entirely when isLocked */}
            {!isLocked && (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                {replyToId ? (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Replying to <strong>{replyToAuthor}</strong></span>
                    <button
                      type="button"
                      className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      onClick={() => { setReplyToId(null); setReplyToAuthor(""); }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Click Reply on a comment to respond.</p>
                )}
                <textarea
                  className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                  placeholder={replyToId ? "Write your reply..." : "Select a comment to reply to"}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      void handlePostReply();
                    }
                  }}
                  disabled={!replyToId || commentPosting}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Ctrl+Enter to send</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handlePostReply()}
                    disabled={!replyToId || !commentBody.trim() || commentPosting}
                  >
                    {commentPosting ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
