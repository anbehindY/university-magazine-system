"use client";

import { useEffect, useRef, useState } from "react";
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


  // ── derived ───────────────────────────────────────────────────────────────
  const activeYear = history.find((y) => y.isActive) ?? null;
  const otherYears = history.filter((y) => !y.isActive);

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
    if (!activeYear || !draftLabel) return;
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/academic-years", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeYear.id,
          yearLabel: draftLabel,
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
    if (!setupLabel) return;
    setSetupStatus("saving");
    setSetupError("");
    try {
      const createRes = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearLabel: setupLabel,
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
    if (!rolloverLabel) return;
    setRolloverStatus("saving");
    setRolloverError("");
    try {
      const createRes = await fetch("/api/admin/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearLabel: rolloverLabel,
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
                  <Label className="text-slate-700">First Closure Date</Label>
                  <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                  <DateTimePicker
                    value={draftFirst}
                    onChange={(v) => { setDraftFirst(v); setSaveStatus("idle"); }}
                    placeholder="Pick date & time"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Final Closure Date</Label>
                  <p className="text-xs text-slate-500">All edits locked after this</p>
                  <DateTimePicker
                    value={draftFinal}
                    onChange={(v) => { setDraftFinal(v); setSaveStatus("idle"); }}
                    placeholder="Pick date & time"
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
                  <Label className="text-slate-700">First Closure Date</Label>
                  <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                  <DateTimePicker
                    value={setupFirst}
                    onChange={setSetupFirst}
                    placeholder="Pick date & time"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Final Closure Date</Label>
                  <p className="text-xs text-slate-500">All edits locked after this</p>
                  <DateTimePicker
                    value={setupFinal}
                    onChange={setSetupFinal}
                    placeholder="Pick date & time"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={setupStatus === "saving" || !setupLabel}
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

      {/* ── Previous Years ── (only rendered when there are entries) */}
      {!historyLoading && otherYears.length > 0 && (
        <Card className="w-full border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Previous Years</CardTitle>
            <CardDescription className="text-slate-500">
              Historical record of past academic years.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 lg:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">First Closure</th>
                    <th className="px-4 py-3">Final Closure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {otherYears.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-4 py-3 font-medium text-slate-900">{item.yearLabel}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDatetime(item.firstClosureDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDatetime(item.finalClosureDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-4 lg:hidden">
              {otherYears.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-base font-semibold text-slate-900">{item.yearLabel}</p>
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
                <Label className="text-slate-700">First Closure Date</Label>
                <p className="text-xs text-slate-500">Students can&apos;t submit after this</p>
                <DateTimePicker
                  value={rolloverFirst}
                  onChange={setRolloverFirst}
                  placeholder="Pick date & time"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Final Closure Date</Label>
                <p className="text-xs text-slate-500">All edits locked after this</p>
                <DateTimePicker
                  value={rolloverFinal}
                  onChange={setRolloverFinal}
                  placeholder="Pick date & time"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  disabled={rolloverStatus === "saving" || !rolloverLabel}
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
