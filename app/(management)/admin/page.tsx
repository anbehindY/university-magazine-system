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
import { DatePicker } from "@/components/ui/date-picker";
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
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";

type AcademicYearItem = {
  id: string;
  yearLabel: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  notiMessage: string;
  firstClosureDate: string | null;
  finalClosureDate: string | null;
  isActive: boolean;
  createdAt: string;
};

function formatTime(value: string) {
  const iso = new Date(value).toISOString();
  return iso.slice(11, 16);
}

function formatDisplayTime(value: string) {
  const [hours, minutes] = formatTime(value).split(":");
  const hourNum = Number(hours);
  const period = hourNum >= 12 ? "PM" : "AM";
  const hour12 = hourNum % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

function formatDateTime(dateValue: string, timeValue: string) {
  const date = new Date(dateValue);
  return `${date.toLocaleDateString()} ${formatDisplayTime(timeValue)}`;
}

function formatDateInputValue(date?: Date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminPanelPage() {
  const RequiredMark = () => <span className="ml-1 text-rose-600" aria-hidden="true">*</span>;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYearItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [automatic, setAutomatic] = useState(true);
  const [yearLabel, setYearLabel] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<AcademicYearItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [endDateError, setEndDateError] = useState("");
  const [firstClosureDate, setFirstClosureDate] = useState<Date | undefined>();
  const [finalClosureDate, setFinalClosureDate] = useState<Date | undefined>();

  function handleStartDateChange(value: string) {
    const nextDate = value ? new Date(`${value}T00:00:00`) : undefined;
    setStartDate(nextDate);
    setEndDateError("");
    if (nextDate && endDate && endDate < nextDate) {
      setEndDate(undefined);
    }
  }

  function handleEndDateChange(value: string) {
    const nextDate = value ? new Date(`${value}T00:00:00`) : undefined;
    if (startDate && nextDate && nextDate < startDate) {
      setEndDateError("End date cannot be earlier than start date.");
      return;
    }
    setEndDateError("");
    setEndDate(nextDate);
  }

  function resetForm() {
    setYearLabel("");
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime("");
    setEndTime("");
    setReason("");
    setMessage("");
    setEndDateError("");
    setFirstClosureDate(undefined);
    setFinalClosureDate(undefined);
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setHistoryError("");
      const response = await fetch("/api/admin/academic-years");
      if (!response.ok) {
        throw new Error("Failed to load closure history.");
      }
      const payload = (await response.json()) as { academicYears: AcademicYearItem[] };
      setHistory(payload.academicYears ?? []);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Failed to load closure history."
      );
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
        throw new Error(payload?.error || "Failed to activate academic year.");
      }
      await loadHistory();
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Failed to activate academic year."
      );
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setErrorMessage("");

    if (!yearLabel || !startDate || !endDate || !startTime || !endTime || !message) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/admin/academic-years", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId ?? undefined,
          yearLabel,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime,
          endTime,
          reason,
          notiMessage: message,
          automatic,
          firstClosureDate: firstClosureDate?.toISOString() ?? null,
          finalClosureDate: finalClosureDate?.toISOString() ?? null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save closure dates.");
      }

      setStatus("success");
      setIsDialogOpen(false);
      setEditingId(null);
      resetForm();
      await loadHistory();
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save closure dates.");
    }
  }

  async function onDelete(id: string) {
    try {
      const response = await fetch("/api/admin/academic-years", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to delete closure record.");
      }

      await loadHistory();
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Failed to delete closure record."
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-4 pb-6 text-slate-900 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Magazine Contribution Deadlines</h1>
        <p className="text-slate-600">
          Configure system closure dates and maintenance windows
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <Card className="w-full border-slate-200 bg-white">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Magazine Contribution Deadlines History</CardTitle>
            <CardDescription className="text-slate-500">
              Review previously scheduled closure windows
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
            <DialogContent className="w-[min(100vw-2rem,40rem)] max-h-[90vh] overflow-y-auto p-0">
              <div className="flex min-h-0 flex-col">
                <DialogHeader className="sticky top-0 z-10 space-y-2 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                  <DialogTitle>
                    {editingId ? "Edit Closure Dates" : "Add Closure Dates"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure system closure dates and maintenance windows
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSave} className="space-y-6 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Automatic Closure</p>
                    <p className="text-xs text-slate-500">
                      Automatically close system at scheduled time
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Switch checked={automatic} onCheckedChange={setAutomatic} />
                    <span>{automatic ? "On" : "Off"}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
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
                    <Label htmlFor="startDate" className="text-slate-700">
                      Start Date
                      <RequiredMark />
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      className="border-slate-200 bg-white text-slate-900"
                      value={formatDateInputValue(startDate)}
                      onChange={(event) => handleStartDateChange(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-slate-700">
                      End Date
                      <RequiredMark />
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      className="border-slate-200 bg-white text-slate-900"
                      min={formatDateInputValue(startDate) || undefined}
                      value={formatDateInputValue(endDate)}
                      onChange={(event) => handleEndDateChange(event.target.value)}
                    />
                    {endDateError ? (
                      <p className="text-sm text-rose-600">{endDateError}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-slate-700">
                      Start Time
                      <RequiredMark />
                    </Label>
                    <TimePicker
                      value={startTime}
                      onChange={setStartTime}
                      placeholder="01:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-slate-700">
                      End Time
                      <RequiredMark />
                    </Label>
                    <TimePicker
                      value={endTime}
                      onChange={setEndTime}
                      placeholder="02:30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">First Closure Date</Label>
                    <DatePicker
                      value={firstClosureDate}
                      onChange={setFirstClosureDate}
                      placeholder="Pick first closure date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Final Closure Date</Label>
                    <DatePicker
                      value={finalClosureDate}
                      onChange={setFinalClosureDate}
                      placeholder="Pick final closure date"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-slate-700">
                    Closure Reason
                  </Label>
                  <textarea
                    id="reason"
                    rows={3}
                    className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Write closure reason here."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-slate-700">
                    Notification Message
                    <RequiredMark />
                  </Label>
                  <textarea
                    id="message"
                    rows={3}
                    className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write notification message here."
                  />
                </div>

                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
                  <Button
                    type="submit"
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 sm:w-auto"
                    disabled={status === "saving"}
                  >
                    {status === "saving"
                      ? "Saving..."
                      : editingId
                      ? "Update"
                      : "Save Changes"}
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
            <p className="text-sm text-slate-500">Loading closure history...</p>
          ) : historyError ? (
            <p className="text-sm text-rose-600">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">No closure dates added yet.</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Academic Year</th>
                      <th className="px-4 py-3">Start</th>
                      <th className="px-4 py-3">End</th>
                      <th className="px-4 py-3">Closure Date</th>
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
                          {formatDateTime(item.startDate, item.startTime)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDateTime(item.endDate, item.endTime)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.firstClosureDate
                            ? new Date(item.firstClosureDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
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
                                  Activating will deactivate the currently active year.
                                </p>
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingId(item.id);
                                setYearLabel(item.yearLabel);
                                setStartDate(new Date(item.startDate));
                                setEndDate(new Date(item.endDate));
                                setStartTime(formatTime(item.startTime));
                                setEndTime(formatTime(item.endTime));
                                setMessage(item.notiMessage);
                                setReason("");
                                setStatus("idle");
                                setErrorMessage("");
                                setFirstClosureDate(item.firstClosureDate ? new Date(item.firstClosureDate) : undefined);
                                setFinalClosureDate(item.finalClosureDate ? new Date(item.finalClosureDate) : undefined);
                                setIsDialogOpen(true);
                              }}
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
              <div className="space-y-4 lg:hidden">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-base font-semibold text-slate-900">
                        {item.yearLabel}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.firstClosureDate
                          ? new Date(item.firstClosureDate).toLocaleDateString()
                          : "No final closure"}
                      </p>
                    </div>
                    <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Start
                        </dt>
                        <dd className="text-slate-800">
                          {formatDateTime(item.startDate, item.startTime)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          End
                        </dt>
                        <dd className="text-slate-800">
                          {formatDateTime(item.endDate, item.endTime)}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs uppercase tracking-wide text-slate-500">
                          Notification
                        </dt>
                        <dd className="text-slate-800">{item.notiMessage}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {item.isActive ? (
                        <Badge className="w-fit bg-emerald-100 text-emerald-800 border-emerald-200">
                          Active
                        </Badge>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full text-emerald-700 hover:text-emerald-800 sm:w-auto"
                            onClick={() => handleActivate(item.id)}
                          >
                            Activate
                          </Button>
                          <p className="text-xs text-slate-500">
                            Activating will deactivate the currently active year.
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          setEditingId(item.id);
                          setYearLabel(item.yearLabel);
                          setStartDate(new Date(item.startDate));
                          setEndDate(new Date(item.endDate));
                          setStartTime(formatTime(item.startTime));
                          setEndTime(formatTime(item.endTime));
                          setMessage(item.notiMessage);
                          setReason("");
                          setStatus("idle");
                          setErrorMessage("");
                          setFirstClosureDate(item.firstClosureDate ? new Date(item.firstClosureDate) : undefined);
                          setFinalClosureDate(item.finalClosureDate ? new Date(item.finalClosureDate) : undefined);
                          setIsDialogOpen(true);
                        }}
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
            <DialogTitle>Delete Closure Record</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              selected closure record.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {deleteTarget ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{deleteTarget.yearLabel}</p>
                <p>
                  {new Date(deleteTarget.startDate).toLocaleDateString()} -{" "}
                  {new Date(deleteTarget.endDate).toLocaleDateString()}
                </p>
                <p>
                  {formatTime(deleteTarget.startTime)} - {formatTime(deleteTarget.endTime)}
                </p>
              </div>
            ) : null}
          </div>
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
