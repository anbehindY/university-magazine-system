"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
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

type AcademicYearItem = {
  id: string;
  yearLabel: string;
  firstClosureDate: string | null;
  finalClosureDate: string | null;
  isActive: boolean;
  createdAt: string;
};

function formatDatetime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminPanelPage() {
  const RequiredMark = () => <span className="ml-1 text-rose-600" aria-hidden="true">*</span>;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYearItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [yearLabel, setYearLabel] = useState("");
  const [firstClosureDate, setFirstClosureDate] = useState<Date | undefined>();
  const [finalClosureDate, setFinalClosureDate] = useState<Date | undefined>();

  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<AcademicYearItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  function resetForm() {
    setYearLabel("");
    setFirstClosureDate(undefined);
    setFinalClosureDate(undefined);
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const response = await fetch("/api/admin/academic-years");
      if (!response.ok) throw new Error("Failed to load academic years.");
      const payload = (await response.json()) as { academicYears: AcademicYearItem[] };
      setHistory(payload.academicYears ?? []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to load academic years.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleActivate(yearId: string) {
    try {
      const response = await fetch("/api/admin/academic-years", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: yearId, isActive: true }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to activate academic year.");
      }
      await loadHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to activate academic year.");
    }
  }

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    if (!yearLabel) {
      setStatus("error");
      setErrorMessage("Please enter an academic year label.");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/admin/academic-years", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          yearLabel,
          firstClosureDate: firstClosureDate?.toISOString() ?? null,
          finalClosureDate: finalClosureDate?.toISOString() ?? null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save academic year.");
      }

      setStatus("success");
      setIsDialogOpen(false);
      setEditingId(null);
      resetForm();
      await loadHistory();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save academic year.");
    }
  }

  async function onDelete(id: string) {
    try {
      const response = await fetch("/api/admin/academic-years", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to delete academic year.");
      }

      await loadHistory();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to delete academic year.");
    }
  }

  function openEditDialog(item: AcademicYearItem) {
    setEditingId(item.id);
    setYearLabel(item.yearLabel);
    setFirstClosureDate(item.firstClosureDate ? new Date(item.firstClosureDate) : undefined);
    setFinalClosureDate(item.finalClosureDate ? new Date(item.finalClosureDate) : undefined);
    setStatus("idle");
    setErrorMessage("");
    setIsDialogOpen(true);
  }

  return (
    <main className="space-y-6 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Academic Years</h1>
        <p className="text-slate-600">
          Configure academic years and their submission closure dates.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <Card className="w-full border-slate-200 bg-white">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Academic Year History</CardTitle>
            <CardDescription className="text-slate-500">
              Manage academic years and set closure deadlines for student submissions.
            </CardDescription>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                resetForm();
                setStatus("idle");
                setErrorMessage("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                  setStatus("idle");
                  setErrorMessage("");
                }}
              >
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[min(100vw-2rem,36rem)] max-h-[90vh] overflow-y-auto p-0">
              <div className="flex min-h-0 flex-col">
                <DialogHeader className="sticky top-0 z-10 space-y-2 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                  <DialogTitle>
                    {editingId ? "Edit Academic Year" : "Add Academic Year"}
                  </DialogTitle>
                  <DialogDescription>
                    Set the year label and optional closure dates.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSave} className="space-y-6 px-4 py-4 sm:px-6">
                  <div className="space-y-2">
                    <Label htmlFor="yearLabel" className="text-slate-700">
                      Academic Year
                      <RequiredMark />
                    </Label>
                    <Input
                      id="yearLabel"
                      className="border-slate-200 bg-white text-slate-900"
                      value={yearLabel}
                      onChange={(e) => setYearLabel(e.target.value)}
                      placeholder="e.g. 2025/2026"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">First Closure Date</Label>
                    <p className="text-xs text-slate-500">
                      Students cannot create new submissions after this date and time.
                    </p>
                    <DateTimePicker
                      value={firstClosureDate}
                      onChange={setFirstClosureDate}
                      placeholder="Pick date & time"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">Final Closure Date</Label>
                    <p className="text-xs text-slate-500">
                      All updates and comments are blocked after this date and time.
                    </p>
                    <DateTimePicker
                      value={finalClosureDate}
                      onChange={setFinalClosureDate}
                      placeholder="Pick date & time"
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
                    <Button
                      type="submit"
                      className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
                      disabled={status === "saving"}
                    >
                      {status === "saving" ? "Saving..." : editingId ? "Update" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  {status === "success" ? (
                    <p className="text-sm text-emerald-600">Saved successfully.</p>
                  ) : null}
                  {status === "error" ? (
                    <p className="text-sm text-rose-600">{errorMessage}</p>
                  ) : null}
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-5 px-4 sm:px-6">
          {historyLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : historyError ? (
            <p className="text-sm text-rose-600">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No academic years added yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Academic Year</th>
                      <th className="px-4 py-3">First Closure</th>
                      <th className="px-4 py-3">Final Closure</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {history.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {item.yearLabel}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDatetime(item.firstClosureDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDatetime(item.finalClosureDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-start gap-2">
                            {item.isActive ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Active
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-700 hover:text-emerald-800"
                                  onClick={() => handleActivate(item.id)}
                                >
                                  Activate
                                </Button>
                                <p className="text-xs text-slate-500">
                                  Deactivates the current active year.
                                </p>
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700"
                              onClick={() => {
                                setDeleteTarget(item);
                                setIsDeleteOpen(true);
                              }}
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

              {/* Mobile cards */}
              <div className="space-y-4 lg:hidden">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-slate-900">{item.yearLabel}</p>
                      {item.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Active
                        </Badge>
                      ) : null}
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">First Closure</dt>
                        <dd className="text-slate-800">{formatDatetime(item.firstClosureDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">Final Closure</dt>
                        <dd className="text-slate-800">{formatDatetime(item.finalClosureDate)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {!item.isActive ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full text-emerald-700 hover:text-emerald-800 sm:w-auto"
                            onClick={() => handleActivate(item.id)}
                          >
                            Activate
                          </Button>
                          <p className="text-xs text-slate-500">Deactivates the current active year.</p>
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => openEditDialog(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full text-rose-600 hover:text-rose-700 sm:w-auto"
                        onClick={() => {
                          setDeleteTarget(item);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="w-[min(100vw-2rem,28rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Academic Year</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The academic year record will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{deleteTarget.yearLabel}</p>
              {deleteTarget.firstClosureDate ? (
                <p>First closure: {formatDatetime(deleteTarget.firstClosureDate)}</p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => deleteTarget && onDelete(deleteTarget.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
