"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
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

type PreviousSortColumn = "yearLabel" | "firstClosureDate" | "finalClosureDate";
type PreviousSortDir = "asc" | "desc";

function formatDatetime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isPastYear(item: AcademicYearItem) {
  const boundary = item.finalClosureDate ?? item.firstClosureDate;
  return !!boundary && new Date(boundary) < new Date();
}

function incrementYearLabel(label: string): string {
  const match = label.match(/^(\d{4})-(\d{4})$/);
  if (!match) return "";
  return `${Number(match[1]) + 1}-${Number(match[2]) + 1}`;
}

function getYearRange(label: string) {
  const match = label.trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1) return null;
  return {
    start: new Date(startYear, 0, 1, 0, 0, 0, 0),
    end: new Date(endYear, 11, 31, 23, 59, 59, 999),
  };
}

function dayAfter(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next;
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function isFinalNotAfterFirst(firstDate?: Date, finalDate?: Date) {
  return !!firstDate && !!finalDate && finalDate.getTime() <= firstDate.getTime();
}

function validateYearAndClosures(
  yearLabel: string,
  firstClosureDate: Date | undefined,
  finalClosureDate: Date | undefined,
  minFirstClosureDate?: Date
) {
  const yearRange = getYearRange(yearLabel);
  if (!yearRange) {
    return "Year label must use YYYY-YYYY format (e.g. 2025-2026).";
  }
  if (!firstClosureDate) {
    return "First closure date is required.";
  }
  if (!finalClosureDate) {
    return "Final closure date is required.";
  }
  if (
    firstClosureDate.getTime() < yearRange.start.getTime() ||
    firstClosureDate.getTime() > yearRange.end.getTime()
  ) {
    return `First closure date must be within ${yearLabel.trim()}.`;
  }
  if (
    minFirstClosureDate &&
    firstClosureDate.getTime() < minFirstClosureDate.getTime()
  ) {
    return "First closure date must be at least tomorrow.";
  }
  if (
    finalClosureDate.getTime() < yearRange.start.getTime() ||
    finalClosureDate.getTime() > yearRange.end.getTime()
  ) {
    return `Final closure date must be within ${yearLabel.trim()}.`;
  }
  if (finalClosureDate.getTime() <= firstClosureDate.getTime()) {
    return "Final closure date must be later than first closure date.";
  }
  return null;
}

function PreviousSortIcon({
  column,
  sortColumn,
  sortDir,
}: {
  column: PreviousSortColumn;
  sortColumn: PreviousSortColumn;
  sortDir: PreviousSortDir;
}) {
  if (column !== sortColumn) {
    return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-40" />;
  }
  return sortDir === "asc"
    ? <ChevronUp className="inline h-3 w-3 ml-1" />
    : <ChevronDown className="inline h-3 w-3 ml-1" />;
}

export default function AdminPanelPage() {
  const RequiredMark = () => (
    <span className="ml-1 text-rose-600" aria-hidden="true">*</span>
  );

  // ── data ──────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<AcademicYearItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ── active year inline edit form ──────────────────────────────────────────
  const [draftLabel, setDraftLabel] = useState("");
  const [draftFirst, setDraftFirst] = useState<Date | undefined>();
  const [draftFinal, setDraftFinal] = useState<Date | undefined>();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  // ── setup form (no active year) ───────────────────────────────────────────
  const [setupLabel, setSetupLabel] = useState("");
  const [setupFirst, setSetupFirst] = useState<Date | undefined>();
  const [setupFinal, setSetupFinal] = useState<Date | undefined>();
  const [setupStatus, setSetupStatus] = useState<"idle" | "saving" | "error">("idle");
  const [setupError, setSetupError] = useState("");

  // ── roll-over dialog ──────────────────────────────────────────────────────
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [rolloverLabel, setRolloverLabel] = useState("");
  const [rolloverFirst, setRolloverFirst] = useState<Date | undefined>();
  const [rolloverFinal, setRolloverFinal] = useState<Date | undefined>();
  const [rolloverStatus, setRolloverStatus] = useState<"idle" | "saving" | "error">("idle");
  const [rolloverError, setRolloverError] = useState("");
  const [previousSortColumn, setPreviousSortColumn] = useState<PreviousSortColumn>("yearLabel");
  const [previousSortDir, setPreviousSortDir] = useState<PreviousSortDir>("desc");
  const [isPreviousEditOpen, setIsPreviousEditOpen] = useState(false);
  const [previousEditId, setPreviousEditId] = useState("");
  const [previousEditLabel, setPreviousEditLabel] = useState("");
  const [previousEditFirst, setPreviousEditFirst] = useState<Date | undefined>();
  const [previousEditFinal, setPreviousEditFinal] = useState<Date | undefined>();
  const [previousEditIsActive, setPreviousEditIsActive] = useState(false);
  const [previousEditStatus, setPreviousEditStatus] = useState<"idle" | "saving" | "error">("idle");
  const [previousEditError, setPreviousEditError] = useState("");


  // ── derived ───────────────────────────────────────────────────────────────
  const activeYear = history.find((y) => y.isActive) ?? null;
  const draftYearRange = getYearRange(draftLabel);
  const setupYearRange = getYearRange(setupLabel);
  const rolloverYearRange = getYearRange(rolloverLabel);
  const nextCreationDay = dayAfter(new Date());
  const draftFirstMinDate = draftYearRange
    ? nextCreationDay.getTime() > draftYearRange.start.getTime()
      ? nextCreationDay
      : draftYearRange.start
    : nextCreationDay;
  const setupFirstMinDate = setupYearRange
    ? nextCreationDay.getTime() > setupYearRange.start.getTime()
      ? nextCreationDay
      : setupYearRange.start
    : nextCreationDay;
  const rolloverFirstMinDate = rolloverYearRange
    ? nextCreationDay.getTime() > rolloverYearRange.start.getTime()
      ? nextCreationDay
      : rolloverYearRange.start
    : nextCreationDay;
  const draftHasYearLabel = draftLabel.trim().length > 0;
  const setupHasYearLabel = setupLabel.trim().length > 0;
  const rolloverHasYearLabel = rolloverLabel.trim().length > 0;
  const draftFirstDisabled = draftFirstMinDate ? { before: draftFirstMinDate } : undefined;
  const setupFirstDisabled = setupFirstMinDate ? { before: setupFirstMinDate } : undefined;
  const rolloverFirstDisabled = rolloverFirstMinDate ? { before: rolloverFirstMinDate } : undefined;
  const draftFinalDisabled = draftFirst ? { before: dayAfter(draftFirst) } : undefined;
  const setupFinalDisabled = setupFirst ? { before: dayAfter(setupFirst) } : undefined;
  const rolloverFinalDisabled = rolloverFirst ? { before: dayAfter(rolloverFirst) } : undefined;
  const draftFinalStartMonth = draftFirst ? monthStart(draftFirst) : draftYearRange?.start;
  const setupFinalStartMonth = setupFirst ? monthStart(setupFirst) : setupYearRange?.start;
  const rolloverFinalStartMonth = rolloverFirst
    ? monthStart(rolloverFirst)
    : rolloverYearRange?.start;
  const previousEditYearRange = getYearRange(previousEditLabel);
  const previousEditHasYearLabel = previousEditLabel.trim().length > 0;
  const previousEditFirstMinDate = previousEditYearRange
    ? nextCreationDay.getTime() > previousEditYearRange.start.getTime()
      ? nextCreationDay
      : previousEditYearRange.start
    : nextCreationDay;
  const previousEditFirstDisabled = { before: previousEditFirstMinDate };
  const previousEditFinalDisabled = previousEditFirst
    ? { before: dayAfter(previousEditFirst) }
    : undefined;
  const previousEditFinalStartMonth = previousEditFirst
    ? monthStart(previousEditFirst)
    : previousEditYearRange?.start;
  const normalizeYearLabel = (value: string) => value.trim();
  const isDuplicateYearLabel = (label: string, excludeId?: string) => {
    const normalizedLabel = normalizeYearLabel(label);
    return history.some(
      (item) =>
        item.id !== excludeId &&
        normalizeYearLabel(item.yearLabel) === normalizedLabel
    );
  };
  const sortedAcademicYears = useMemo(() => {
    const dateValue = (value: string | null) => (value ? new Date(value).getTime() : 0);
    const direction = previousSortDir === "asc" ? 1 : -1;
    return [...history].sort((a, b) => {
      if (previousSortColumn === "yearLabel") {
        return a.yearLabel.localeCompare(b.yearLabel, undefined, { numeric: true }) * direction;
      }
      if (previousSortColumn === "firstClosureDate") {
        return (dateValue(a.firstClosureDate) - dateValue(b.firstClosureDate)) * direction;
      }
      return (dateValue(a.finalClosureDate) - dateValue(b.finalClosureDate)) * direction;
    });
  }, [history, previousSortColumn, previousSortDir]);

  useEffect(() => {
    if (isFinalNotAfterFirst(draftFirst, draftFinal)) {
      setDraftFinal(undefined);
      setSaveStatus("error");
      setSaveError("Final closure date must be later than first closure date.");
    }
  }, [draftFirst, draftFinal]);

  useEffect(() => {
    if (isFinalNotAfterFirst(setupFirst, setupFinal)) {
      setSetupFinal(undefined);
      setSetupStatus("error");
      setSetupError("Final closure date must be later than first closure date.");
    }
  }, [setupFirst, setupFinal]);

  useEffect(() => {
    if (isFinalNotAfterFirst(rolloverFirst, rolloverFinal)) {
      setRolloverFinal(undefined);
      setRolloverStatus("error");
      setRolloverError("Final closure date must be later than first closure date.");
    }
  }, [rolloverFirst, rolloverFinal]);

  // Sync inline form whenever the active year changes (e.g. after a save)
  useEffect(() => {
    if (activeYear) {
      setDraftLabel(activeYear.yearLabel);
      setDraftFirst(activeYear.firstClosureDate ? new Date(activeYear.firstClosureDate) : undefined);
      setDraftFinal(activeYear.finalClosureDate ? new Date(activeYear.finalClosureDate) : undefined);
      setSaveStatus("idle");
      setSaveError("");
    }
  }, [activeYear?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── data fetching ─────────────────────────────────────────────────────────
  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setLoadError("");
      const res = await fetch("/api/admin/academic-years");
      if (!res.ok) throw new Error("Failed to load academic years.");
      const payload = (await res.json()) as { academicYears: AcademicYearItem[] };
      setHistory(payload.academicYears ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load academic years.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  // ── auto-deactivation: if active year's final closure date has passed, deactivate it ──
  const hasAutoDeactivated = useRef(false);
  useEffect(() => {
    if (!activeYear || !isPastYear(activeYear)) return;
    if (hasAutoDeactivated.current) return;
    hasAutoDeactivated.current = true;
    fetch("/api/admin/academic-years", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeYear.id, isActive: false }),
    })
      .then((res) => { if (res.ok) loadHistory(); })
      .catch((err) => console.error("Auto-deactivation failed:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear?.id, activeYear?.finalClosureDate]);

  // Reset the guard when the active year changes (different id = new year)
  useEffect(() => {
    hasAutoDeactivated.current = false;
  }, [activeYear?.id]);

  // ── shared activate (throws on failure so callers handle errors) ──────────
  async function activate(id: string) {
    const res = await fetch("/api/admin/academic-years", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: true }),
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Failed to activate.");
    }
    await loadHistory();
  }

  // ── save active year ──────────────────────────────────────────────────────
  async function saveActive(e: React.FormEvent) {
    e.preventDefault();
    if (!activeYear) return;
    const validationError = validateYearAndClosures(
      draftLabel,
      draftFirst,
      draftFinal,
      nextCreationDay
    );
    if (validationError) {
      setSaveStatus("error");
      setSaveError(validationError);
      return;
    }
    if (isDuplicateYearLabel(draftLabel, activeYear.id)) {
      setSaveStatus("error");
      setSaveError(`Academic year ${normalizeYearLabel(draftLabel)} already exists.`);
      return;
    }
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeYear.id,
          yearLabel: normalizeYearLabel(draftLabel),
          firstClosureDate: draftFirst?.toISOString() ?? null,
          finalClosureDate: draftFinal?.toISOString() ?? null,
          isActive: true, // keep it active
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save.");
      }
      await loadHistory();
      toast.success("Closure dates saved successfully.");
      setSaveStatus("idle");
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Failed to save.");
    }
  }

  // ── first-time setup ──────────────────────────────────────────────────────
  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateYearAndClosures(
      setupLabel,
      setupFirst,
      setupFinal,
      nextCreationDay
    );
    if (validationError) {
      setSetupStatus("error");
      setSetupError(validationError);
      return;
    }
    if (isDuplicateYearLabel(setupLabel)) {
      setSetupStatus("error");
      setSetupError(`Academic year ${normalizeYearLabel(setupLabel)} already exists.`);
      return;
    }
    setSetupStatus("saving");
    setSetupError("");
    try {
      const createRes = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearLabel: normalizeYearLabel(setupLabel),
          firstClosureDate: setupFirst?.toISOString() ?? null,
          finalClosureDate: setupFinal?.toISOString() ?? null,
        }),
      });
      if (!createRes.ok) {
        const payload = (await createRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create year.");
      }
      const { academicYear } = (await createRes.json()) as { academicYear: AcademicYearItem };
      await activate(academicYear.id);
      toast.success("Academic year set up and activated.");
      setSetupLabel("");
      setSetupFirst(undefined);
      setSetupFinal(undefined);
      setSetupStatus("idle");
    } catch (error) {
      setSetupStatus("error");
      setSetupError(error instanceof Error ? error.message : "Failed to set up year.");
    }
  }

  // ── roll over ─────────────────────────────────────────────────────────────
  function openRollover() {
    setRolloverLabel(incrementYearLabel(activeYear?.yearLabel ?? ""));
    setRolloverFirst(undefined);
    setRolloverFinal(undefined);
    setRolloverStatus("idle");
    setRolloverError("");
    setIsRolloverOpen(true);
  }

  async function handleRollover(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateYearAndClosures(
      rolloverLabel,
      rolloverFirst,
      rolloverFinal,
      nextCreationDay
    );
    if (validationError) {
      setRolloverStatus("error");
      setRolloverError(validationError);
      return;
    }
    if (isDuplicateYearLabel(rolloverLabel)) {
      setRolloverStatus("error");
      setRolloverError(`Academic year ${normalizeYearLabel(rolloverLabel)} already exists.`);
      return;
    }
    setRolloverStatus("saving");
    setRolloverError("");
    try {
      const createRes = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearLabel: normalizeYearLabel(rolloverLabel),
          firstClosureDate: rolloverFirst?.toISOString() ?? null,
          finalClosureDate: rolloverFinal?.toISOString() ?? null,
        }),
      });
      if (!createRes.ok) {
        const payload = (await createRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to create new year.");
      }
      const { academicYear } = (await createRes.json()) as { academicYear: AcademicYearItem };
      await activate(academicYear.id);
      toast.success(`Rolled over to ${rolloverLabel}.`);
      setIsRolloverOpen(false);
    } catch (error) {
      setRolloverStatus("error");
      setRolloverError(error instanceof Error ? error.message : "Failed to roll over.");
    }
  }
  function handlePreviousSort(column: PreviousSortColumn) {
    if (previousSortColumn === column) {
      setPreviousSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setPreviousSortColumn(column);
    setPreviousSortDir("asc");
  }

  function openPreviousEdit(item: AcademicYearItem) {
    setPreviousEditId(item.id);
    setPreviousEditLabel(item.yearLabel);
    setPreviousEditFirst(item.firstClosureDate ? new Date(item.firstClosureDate) : undefined);
    setPreviousEditFinal(item.finalClosureDate ? new Date(item.finalClosureDate) : undefined);
    setPreviousEditIsActive(item.isActive);
    setPreviousEditStatus("idle");
    setPreviousEditError("");
    setIsPreviousEditOpen(true);
  }

  async function handlePreviousEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!previousEditId) return;
    const validationError = validateYearAndClosures(
      previousEditLabel,
      previousEditFirst,
      previousEditFinal,
      nextCreationDay
    );
    if (validationError) {
      setPreviousEditStatus("error");
      setPreviousEditError(validationError);
      return;
    }
    if (isDuplicateYearLabel(previousEditLabel, previousEditId)) {
      setPreviousEditStatus("error");
      setPreviousEditError(`Academic year ${normalizeYearLabel(previousEditLabel)} already exists.`);
      return;
    }
    setPreviousEditStatus("saving");
    setPreviousEditError("");
    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: previousEditId,
          yearLabel: normalizeYearLabel(previousEditLabel),
          firstClosureDate: previousEditFirst?.toISOString() ?? null,
          finalClosureDate: previousEditFinal?.toISOString() ?? null,
          isActive: previousEditIsActive,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to update previous year.");
      }
      await loadHistory();
      setPreviousEditStatus("idle");
      setIsPreviousEditOpen(false);
      toast.success("Academic year updated successfully.");
    } catch (error) {
      setPreviousEditStatus("error");
      setPreviousEditError(
        error instanceof Error ? error.message : "Failed to update previous year."
      );
    }
  }


  // ── render ────────────────────────────────────────────────────────────────
  return (
    <main className="space-y-6 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Closure Dates</h1>
        <p className="text-slate-600">
          Configure the active academic year and its submission closure windows.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {/* ── Current Academic Year ── */}
      <Card className="w-full border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Current Academic Year</CardTitle>
            {activeYear && (
              <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">Active</Badge>
            )}
          </div>
          <CardDescription className="text-slate-500">
            {activeYear
              ? "Edit the year label and closure dates below. Changes take effect immediately."
              : "No active year is configured. Set one up to open student submissions."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : loadError ? (
            <p className="text-sm text-rose-600">{loadError}</p>
          ) : activeYear ? (
            // ── inline edit form ──────────────────────────────────────────
            <form onSubmit={saveActive} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="draftLabel" className="text-slate-700">
                    Year Label<RequiredMark />
                  </Label>
                  <p className="text-xs text-slate-500">Format: YYYY-YYYY</p>
                  <Input
                    id="draftLabel"
                    className="border-slate-200 bg-white text-slate-900"
                    value={draftLabel}
                    onChange={(e) => { setDraftLabel(e.target.value); setSaveStatus("idle"); }}
                    placeholder="e.g. 2025-2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    First Closure Date<RequiredMark />
                  </Label>
                  <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                  <DateTimePicker
                    value={draftFirst}
                    onChange={(v) => {
                      setDraftFirst(v);
                      if (v && draftFinal && draftFinal.getTime() <= v.getTime()) {
                        setDraftFinal(undefined);
                      }
                      setSaveStatus("idle");
                    }}
                    placeholder={draftHasYearLabel ? "Pick date & time" : "Enter year label first"}
                    startMonth={draftYearRange?.start}
                    endMonth={draftYearRange?.end}
                    disabledDates={draftFirstDisabled}
                    disabled={!draftHasYearLabel}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Final Closure Date<RequiredMark />
                  </Label>
                  <p className="text-xs text-slate-500">All edits locked after this</p>
                  <DateTimePicker
                    value={draftFinal}
                    onChange={(v) => {
                      if (isFinalNotAfterFirst(draftFirst, v)) {
                        setDraftFinal(undefined);
                        setSaveStatus("error");
                        setSaveError("Final closure date must be later than first closure date.");
                        return;
                      }
                      setDraftFinal(v);
                      setSaveStatus("idle");
                    }}
                    placeholder={draftFirst ? "Pick date & time" : "Select first closure date first"}
                    startMonth={draftFinalStartMonth}
                    endMonth={draftYearRange?.end}
                    disabledDates={draftFinalDisabled}
                    disabled={!draftFirst}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="submit"
                    className="bg-slate-900 text-white hover:bg-slate-800"
                    disabled={saveStatus === "saving"}
                  >
                    {saveStatus === "saving" ? "Saving..." : "Save Changes"}
                  </Button>
                  {saveStatus === "error" && (
                    <p className="text-sm text-rose-600">{saveError}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 text-slate-600"
                  onClick={openRollover}
                >
                  Roll Over to Next Year →
                </Button>
              </div>
            </form>
          ) : (
            // ── first-time setup form ────────────────────────────────────
            <form onSubmit={handleSetup} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="setupLabel" className="text-slate-700">
                    Year Label<RequiredMark />
                  </Label>
                  <p className="text-xs text-slate-500">Format: YYYY-YYYY</p>
                  <Input
                    id="setupLabel"
                    className="border-slate-200 bg-white text-slate-900"
                    value={setupLabel}
                    onChange={(e) => setSetupLabel(e.target.value)}
                    placeholder="e.g. 2025-2026"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    First Closure Date<RequiredMark />
                  </Label>
                  <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                  <DateTimePicker
                    value={setupFirst}
                    onChange={(v) => {
                      setSetupFirst(v);
                      if (v && setupFinal && setupFinal.getTime() <= v.getTime()) {
                        setSetupFinal(undefined);
                      }
                      setSetupStatus("idle");
                    }}
                    placeholder={setupHasYearLabel ? "Pick date & time" : "Enter year label first"}
                    startMonth={setupYearRange?.start}
                    endMonth={setupYearRange?.end}
                    disabledDates={setupFirstDisabled}
                    disabled={!setupHasYearLabel}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    Final Closure Date<RequiredMark />
                  </Label>
                  <p className="text-xs text-slate-500">All edits locked after this</p>
                  <DateTimePicker
                    value={setupFinal}
                    onChange={(v) => {
                      if (isFinalNotAfterFirst(setupFirst, v)) {
                        setSetupFinal(undefined);
                        setSetupStatus("error");
                        setSetupError("Final closure date must be later than first closure date.");
                        return;
                      }
                      setSetupFinal(v);
                      setSetupStatus("idle");
                    }}
                    placeholder={setupFirst ? "Pick date & time" : "Select first closure date first"}
                    startMonth={setupFinalStartMonth}
                    endMonth={setupYearRange?.end}
                    disabledDates={setupFinalDisabled}
                    disabled={!setupFirst}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={setupStatus === "saving"}
                >
                  {setupStatus === "saving" ? "Setting up..." : "Set Up & Activate"}
                </Button>
                {setupStatus === "error" && (
                  <p className="text-sm text-rose-600">{setupError}</p>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Academic Years ── (only rendered when there are entries) */}
      {!historyLoading && history.length > 0 && (
        <Card className="w-full border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Academic Years</CardTitle>
            <CardDescription className="text-slate-500">
              List of all academic years in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="cursor-pointer select-none text-left hover:text-slate-700"
                        onClick={() => handlePreviousSort("yearLabel")}
                      >
                        Year
                        <PreviousSortIcon
                          column="yearLabel"
                          sortColumn={previousSortColumn}
                          sortDir={previousSortDir}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="cursor-pointer select-none text-left hover:text-slate-700"
                        onClick={() => handlePreviousSort("firstClosureDate")}
                      >
                        First Closure
                        <PreviousSortIcon
                          column="firstClosureDate"
                          sortColumn={previousSortColumn}
                          sortDir={previousSortDir}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        className="cursor-pointer select-none text-left hover:text-slate-700"
                        onClick={() => handlePreviousSort("finalClosureDate")}
                      >
                        Final Closure
                        <PreviousSortIcon
                          column="finalClosureDate"
                          sortColumn={previousSortColumn}
                          sortDir={previousSortDir}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedAcademicYears.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.yearLabel}</span>
                          {item.isActive && (
                            <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                              Active
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDatetime(item.firstClosureDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDatetime(item.finalClosureDate)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-200 text-slate-700"
                          onClick={() => openPreviousEdit(item)}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-4 lg:hidden">
              {sortedAcademicYears.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{item.yearLabel}</p>
                      {item.isActive && (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                          Active
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-200 text-slate-700"
                      onClick={() => openPreviousEdit(item)}
                    >
                      Edit
                    </Button>
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={isPreviousEditOpen}
        onOpenChange={(open) => {
          setIsPreviousEditOpen(open);
          if (!open) {
            setPreviousEditStatus("idle");
            setPreviousEditError("");
          }
        }}
      >
        <DialogContent className="w-[min(100vw-2rem,36rem)] max-h-[90vh] overflow-y-auto p-0">
          <div className="flex min-h-0 flex-col">
            <DialogHeader className="sticky top-0 z-10 space-y-2 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <DialogTitle>Edit Academic Year</DialogTitle>
              <DialogDescription>
                Update year label and closure dates for this record.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePreviousEditSave} className="space-y-6 px-4 py-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="previousEditLabel" className="text-slate-700">
                  Year Label<RequiredMark />
                </Label>
                <p className="text-xs text-slate-500">Format: YYYY-YYYY</p>
                <Input
                  id="previousEditLabel"
                  className="border-slate-200 bg-white text-slate-900"
                  value={previousEditLabel}
                  onChange={(e) => {
                    setPreviousEditLabel(e.target.value);
                    setPreviousEditStatus("idle");
                  }}
                  placeholder="e.g. 2025-2026"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">
                  First Closure Date<RequiredMark />
                </Label>
                <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                <DateTimePicker
                  value={previousEditFirst}
                  onChange={(v) => {
                    setPreviousEditFirst(v);
                    if (v && previousEditFinal && previousEditFinal.getTime() <= v.getTime()) {
                      setPreviousEditFinal(undefined);
                    }
                    setPreviousEditStatus("idle");
                  }}
                  placeholder={previousEditHasYearLabel ? "Pick date & time" : "Enter year label first"}
                  startMonth={previousEditYearRange?.start}
                  endMonth={previousEditYearRange?.end}
                  disabledDates={previousEditFirstDisabled}
                  disabled={!previousEditHasYearLabel}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">
                  Final Closure Date<RequiredMark />
                </Label>
                <p className="text-xs text-slate-500">All edits locked after this</p>
                <DateTimePicker
                  value={previousEditFinal}
                  onChange={(v) => {
                    if (isFinalNotAfterFirst(previousEditFirst, v)) {
                      setPreviousEditFinal(undefined);
                      setPreviousEditStatus("error");
                      setPreviousEditError("Final closure date must be later than first closure date.");
                      return;
                    }
                    setPreviousEditFinal(v);
                    setPreviousEditStatus("idle");
                  }}
                  placeholder={previousEditFirst ? "Pick date & time" : "Select first closure date first"}
                  startMonth={previousEditFinalStartMonth}
                  endMonth={previousEditYearRange?.end}
                  disabledDates={previousEditFinalDisabled}
                  disabled={!previousEditFirst}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={previousEditStatus === "saving"}
                >
                  {previousEditStatus === "saving" ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreviousEditOpen(false)}
                >
                  Cancel
                </Button>
              </div>
              {previousEditStatus === "error" && (
                <p className="text-sm text-rose-600">{previousEditError}</p>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Roll Over Dialog ── */}
      <Dialog
        open={isRolloverOpen}
        onOpenChange={(open) => {
          setIsRolloverOpen(open);
          if (!open) { setRolloverStatus("idle"); setRolloverError(""); }
        }}
      >
        <DialogContent className="w-[min(100vw-2rem,36rem)] max-h-[90vh] overflow-y-auto p-0">
          <div className="flex min-h-0 flex-col">
            <DialogHeader className="sticky top-0 z-10 space-y-2 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <DialogTitle>Roll Over to Next Year</DialogTitle>
              <DialogDescription>
                {activeYear
                  ? `This will archive ${activeYear.yearLabel} and open the new year for student submissions.`
                  : "Set up the next academic year."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRollover} className="space-y-6 px-4 py-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="rolloverLabel" className="text-slate-700">
                  New Year Label<RequiredMark />
                </Label>
                <p className="text-xs text-slate-500">Format: YYYY-YYYY</p>
                <Input
                  id="rolloverLabel"
                  className="border-slate-200 bg-white text-slate-900"
                  value={rolloverLabel}
                  onChange={(e) => setRolloverLabel(e.target.value)}
                  placeholder="e.g. 2026-2027"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">
                  First Closure Date<RequiredMark />
                </Label>
                <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                <DateTimePicker
                  value={rolloverFirst}
                  onChange={(v) => {
                    setRolloverFirst(v);
                    if (v && rolloverFinal && rolloverFinal.getTime() <= v.getTime()) {
                      setRolloverFinal(undefined);
                    }
                    setRolloverStatus("idle");
                  }}
                  placeholder={rolloverHasYearLabel ? "Pick date & time" : "Enter year label first"}
                  startMonth={rolloverYearRange?.start}
                  endMonth={rolloverYearRange?.end}
                  disabledDates={rolloverFirstDisabled}
                  disabled={!rolloverHasYearLabel}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">
                  Final Closure Date<RequiredMark />
                </Label>
                <p className="text-xs text-slate-500">All edits locked after this</p>
                <DateTimePicker
                  value={rolloverFinal}
                  onChange={(v) => {
                    if (isFinalNotAfterFirst(rolloverFirst, v)) {
                      setRolloverFinal(undefined);
                      setRolloverStatus("error");
                      setRolloverError("Final closure date must be later than first closure date.");
                      return;
                    }
                    setRolloverFinal(v);
                    setRolloverStatus("idle");
                  }}
                  placeholder={rolloverFirst ? "Pick date & time" : "Select first closure date first"}
                  startMonth={rolloverFinalStartMonth}
                  endMonth={rolloverYearRange?.end}
                  disabledDates={rolloverFinalDisabled}
                  disabled={!rolloverFirst}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={rolloverStatus === "saving"}
                >
                  {rolloverStatus === "saving"
                    ? "Switching..."
                    : activeYear
                    ? `Archive ${activeYear.yearLabel} & Start ${rolloverLabel || "…"}`
                    : "Start New Year"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRolloverOpen(false)}
                >
                  Cancel
                </Button>
              </div>

              {rolloverStatus === "error" && (
                <p className="text-sm text-rose-600">{rolloverError}</p>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>

    </main>
  );
}
