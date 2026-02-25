"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";
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
import { LoadingScreen } from "@/components/ui/loading-screen";
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
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

const DRAFT_STORAGE_KEY = "studentSubmissionDraft";

const ACCEPTED_MIME_TYPES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function isAcceptedFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  const lowerName = file.name.toLowerCase();
  return lowerName.endsWith(".doc") || lowerName.endsWith(".docx");
}

export default function StudentSubmissionsPage() {
  const { data: session, isPending } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [draftFileNames, setDraftFileNames] = useState<string[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftSubmissionId, setDraftSubmissionId] = useState<string | null>(null);
  const [finalClosureDate, setFinalClosureDate] = useState<string | null>(null);
  const [closureYearLabel, setClosureYearLabel] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
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
      notes: string | null;
      createdAt: string;
      updatedAt: string;
      submittedAt: string | null;
      files: { id: string; url: string; pathname: string; createdAt: string }[];
    }[]
  >([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
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
  const [isDragging, setIsDragging] = useState(false);
  const [editingFiles, setEditingFiles] = useState<
    { id: string; url: string; pathname: string }[]
  >([]);

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

  const invalidFiles = useMemo(
    () => files.filter((file) => !isAcceptedFile(file)),
    [files]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        agreed?: boolean;
        notes?: string;
        fileNames?: string[];
        savedAt?: string;
        submissionId?: string;
      };
      setAgreed(Boolean(parsed.agreed));
      setNotes(parsed.notes ?? "");
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

        const closureDate = payload.academicYear?.firstClosureDate ?? payload.academicYear?.endDate ?? null;
        setFinalClosureDate(closureDate);
        setClosureYearLabel(payload.academicYear?.yearLabel ?? null);

        if (closureDate) {
          const cutoff = new Date(closureDate);
          cutoff.setHours(23, 59, 59, 999);
          setIsClosed(Date.now() > cutoff.getTime());
        } else {
          setIsClosed(false);
        }
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
    setNotes("");
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
    notes: string | null;
    files: { id: string; url: string; pathname: string; createdAt: string }[];
    updatedAt: string;
  }) {
    setEditingSubmissionId(submission.id);
    setEditingStatus(submission.status);
    setDraftSubmissionId(submission.id);
    setNotes(submission.notes ?? "");
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
    setUploadedBlobs(
      submission.files.map((file) => ({
        url: file.url,
        pathname: file.pathname,
      }))
    );
    setIsDialogOpen(true);
  }

  function onFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
    setUploadedBlobs([]);
  }

  function onDropFiles(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (isClosed || isBusy) return;
    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (dropped.length === 0) return;
    setFiles(dropped);
    setUploadedBlobs([]);
    setIsDragging(false);
  }

  function removeFileAt(index: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
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
          notes: string | null;
          createdAt: string;
          updatedAt: string;
          submittedAt: string | null;
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
        notes,
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
          notes,
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

    if (!agreed) {
      toast.error("You must agree to the Terms and Conditions before submitting.");
      return;
    }

    const hasExistingFiles = draftFileNames.length > 0 || uploadedBlobs.length > 0;
    if (files.length === 0 && !hasExistingFiles) {
      toast.error("Please upload at least one Word document or image.");
      return;
    }

    if (invalidFiles.length > 0) {
      toast.error("Only Word documents (.doc, .docx) and image files are allowed.");
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
            <CardTitle>Your submissions</CardTitle>
            <CardDescription className="text-slate-500">
              Drafts and submitted entries saved to the system.
            </CardDescription>
          </div>
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
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-slate-100 text-slate-700" variant="secondary">
                    .doc / .docx
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700" variant="secondary">
                    PNG / JPG / GIF / SVG
                  </Badge>
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
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
                    <Alert variant={isClosed ? "destructive" : "default"}>
                      <AlertTitle>
                        {isClosed ? "Editing closed" : "Final closure date"}
                      </AlertTitle>
                      <AlertDescription>
                        {finalClosureDate
                          ? `Editing ${isClosed ? "closed" : "is available"} through ${new Date(
                              finalClosureDate
                            ).toLocaleDateString()}${
                              closureYearLabel ? ` (${closureYearLabel})` : ""
                            }.`
                          : "No final closure date has been published yet."}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="submission-files">Upload files</Label>
                    <label
                      htmlFor="submission-files"
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (!isClosed && !isBusy) setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDropFiles}
                      className={`flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                        isDragging
                          ? "border-amber-400 bg-amber-50 text-slate-900"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      } ${isClosed || isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <span className="text-sm font-medium text-slate-800">
                        Drag & drop your files here
                      </span>
                      <span className="text-xs text-slate-500">
                        or click to browse (.doc, .docx, images)
                      </span>
                      <Input
                        id="submission-files"
                        type="file"
                        accept=".doc,.docx,image/*"
                        multiple
                        onChange={onFilesChange}
                        disabled={isClosed || isBusy}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-slate-500">
                      Attach your article document and any supporting images.
                    </p>
                  </div>

                    {files.length > 0 ? (
                      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-700">
                            Selected files
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
                    ) : draftFileNames.length > 0 || editingFiles.length > 0 ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-700">
                          Existing files
                        </p>
                        <ul className="space-y-1 text-sm text-slate-600">
                          {editingFiles.length > 0
                            ? editingFiles.map((file) => (
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
                              ))
                            : draftFileNames.map((fileName) => (
                                <li key={fileName}>{getFileName(fileName)}</li>
                              ))}
                        </ul>
                      </div>
                    ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="submission-notes">Draft notes</Label>
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
                          uploadedBlobs.length === 0) ||
                        isClosed ||
                        isBusy
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
        </CardHeader>
        <CardContent className="space-y-4">
          {submissionsLoading ? <LoadingScreen className="min-h-[20vh]" /> : null}

          {submissionsError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load submissions</AlertTitle>
              <AlertDescription>{submissionsError}</AlertDescription>
            </Alert>
          ) : null}

          {!submissionsLoading && !submissionsError && submissions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No submissions yet. Use “New Submission” to get started.
            </p>
          ) : null}

          {!submissionsLoading && !submissionsError && submissions.length > 0 ? (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3">Files</th>
                      <th className="px-4 py-3">Submitted At</th>
                      <th className="px-4 py-3">Updated At</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="bg-white">
                        <td className="px-4 py-3">
                          <Badge
                            className={getStatusBadgeClass(submission.status)}
                            variant="secondary"
                          >
                            {submission.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <span className="block max-w-[20rem] truncate">
                            {submission.notes ? submission.notes : "No notes yet."}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {submission.files.length > 0 ? (
                            <div className="space-y-1 text-slate-700">
                              <p className="text-sm font-medium">
                                {submission.files.length} file
                                {submission.files.length === 1 ? "" : "s"}
                              </p>
                              <ul className="space-y-1 text-xs text-slate-500">
                                {submission.files.map((file) => (
                                  <li key={file.id}>{getFileName(file.pathname)}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <span className="text-slate-500">No files</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {submission.submittedAt
                            ? new Date(submission.submittedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(submission.updatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
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
                              variant="ghost"
                              onClick={() =>
                                setDeleteTarget({
                                  id: submission.id,
                                  status: submission.status,
                                })
                              }
                              disabled={submission.status === "SUBMITTED"}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-800">
                          {submission.status === "SUBMITTED" ? "Submitted" : "Draft"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Updated {new Date(submission.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        className={getStatusBadgeClass(submission.status)}
                        variant="secondary"
                      >
                        {submission.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-200/60 px-2 py-1">
                        Created {new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-slate-200/60 px-2 py-1">
                        {submission.submittedAt
                          ? `Submitted ${new Date(submission.submittedAt).toLocaleDateString()}`
                          : "Not submitted"}
                      </span>
                      <span className="rounded-full bg-slate-200/60 px-2 py-1">
                        {submission.files.length} file
                        {submission.files.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {submission.notes ? (
                      <p className="mt-3 text-sm text-slate-600">{submission.notes}</p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No notes yet.</p>
                    )}
                    {submission.files.length > 0 ? (
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p className="font-medium text-slate-700">Files</p>
                        <ul className="space-y-1">
                          {submission.files.map((file) => (
                            <li key={file.id}>{getFileName(file.pathname)}</li>
                          ))}
                        </ul>
                        <p className="text-xs text-slate-500">
                          {submission.files.length} file
                          {submission.files.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">No files attached.</p>
                    )}
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => startEditSubmission(submission)}
                          disabled={isClosed}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setDeleteTarget({
                              id: submission.id,
                              status: submission.status,
                            })
                          }
                          disabled={submission.status === "SUBMITTED"}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

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
    </main>
  );
}
