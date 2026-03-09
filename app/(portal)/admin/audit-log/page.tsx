"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  metadata: {
    submissionTitle?: string;
    facultyName?: string;
    studentName?: string;
  } | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
  };
};

function getDateRange(preset: string): { from: string; to: string } | null {
  if (preset === "all") return null;
  const now = new Date();
  const to = now.toISOString().split("T")[0];
  if (preset === "today") return { from: to, to };
  if (preset === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { from: d.toISOString().split("T")[0], to };
  }
  if (preset === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { from: d.toISOString().split("T")[0], to };
  }
  return null;
}

export default function AuditLogPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("30d");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const allowedRoles = ["ADMINISTRATOR", "MARKETING_MANAGER"];

  useEffect(() => {
    if (
      !isPending &&
      (!session?.user || !allowedRoles.includes(session.user.role ?? ""))
    ) {
      router.push("/dashboard");
    }
  }, [isPending, session, router]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      // Use preset or custom dates
      if (preset) {
        const range = getDateRange(preset);
        if (range) {
          params.set("from", range.from);
          params.set("to", range.to);
        }
      } else {
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
      }

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load audit log.");
        setEntries([]);
        return;
      }

      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load audit log.");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, preset, fromDate, toDate]);

  useEffect(() => {
    if (
      isPending ||
      !session?.user ||
      !allowedRoles.includes(session.user.role ?? "")
    ) {
      return;
    }
    fetchEntries();
  }, [isPending, session?.user, session?.user?.role, fetchEntries]);

  function handlePresetClick(value: string) {
    setPreset(value);
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function handleFromDateChange(value: string) {
    setFromDate(value);
    setPreset("");
    setPage(1);
  }

  function handleToDateChange(value: string) {
    setToDate(value);
    setPreset("");
    setPage(1);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  if (isPending) {
    return <LoadingScreen />;
  }

  if (
    !session?.user ||
    !allowedRoles.includes(session.user.role ?? "")
  ) {
    return <LoadingScreen />;
  }

  const presets = [
    { label: "Today", value: "today" },
    { label: "Last 7 days", value: "7d" },
    { label: "Last 30 days", value: "30d" },
    { label: "All time", value: "all" },
  ];

  return (
    <main className="space-y-6 text-slate-900">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Audit Log
        </h1>
        <p className="text-base text-slate-500">
          Selection change history for all faculties
        </p>
      </div>

      <div className="border-t border-slate-200" />

      {/* Date filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {presets.map((p) => (
          <Button
            key={p.value}
            variant={preset === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick(p.value)}
            className={
              preset === p.value
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }
          >
            {p.label}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-slate-500">From</span>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="w-40 bg-white border-slate-200 text-slate-900"
          />
          <span className="text-sm text-slate-500">To</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="w-40 bg-white border-slate-200 text-slate-900"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Coordinator
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Submission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Faculty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {[...Array(pageSize)].map((_, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-28 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20 rounded-sm" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-36 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-32 rounded" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ScrollText className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No audit entries found</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Coordinator
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Submission
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Faculty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const meta = entry.metadata as {
                    submissionTitle?: string;
                    facultyName?: string;
                    studentName?: string;
                  } | null;
                  const isSelected = entry.newValue === "true";

                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {entry.actor.name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant="outline"
                          className={
                            isSelected
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {isSelected ? "Selected" : "Deselected"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {meta?.submissionTitle ?? "Untitled"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {meta?.facultyName ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {meta?.studentName ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {format(
                          new Date(entry.createdAt),
                          "d MMM yyyy, h:mm a"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}
    </main>
  );
}
