"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/ui/pagination-controls";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Guest = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  faculty: { name: string } | null;
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function CoordinatorGuestListPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Fetch guests
  useEffect(() => {
    let cancelled = false;

    async function fetchGuests() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (debouncedSearch) params.set("q", debouncedSearch);

        const res = await fetch(`/api/coordinator/guests?${params}`);
        const data = (await res.json()) as {
          guests?: Guest[];
          total?: number;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to load guests.");
          setGuests([]);
          return;
        }
        setGuests(data.guests ?? []);
        setTotal(data.total ?? 0);
      } catch {
        if (!cancelled) {
          setError("Failed to load guests.");
          setGuests([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGuests();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, debouncedSearch]);

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  function formatDate(value: string) {
    try {
      return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <main className="space-y-6 text-slate-900">
      {/* Page header */}
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">Guest List</h1>
          {!loading && (
            <Badge className="bg-slate-100 text-slate-700 border-slate-200">
              {total} {total === 1 ? "guest" : "guests"}
            </Badge>
          )}
        </div>
        <p className="text-slate-600">
          Guests registered for your faculty.
        </p>
      </header>

      <Separator className="bg-slate-200" />

      {/* Search */}
      <div className="max-w-sm">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[700px] w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-sm font-medium">Registered</th>
                <th className="px-4 py-3 text-sm font-medium">Faculty</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(pageSize)].map((_, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-40 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded" /></td>
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
      {!loading && !error && total === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-500">
            {debouncedSearch
              ? "No guests match your search."
              : "No guests registered yet."}
          </p>
        </div>
      )}

      {/* Guest table */}
      {!loading && !error && guests.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[700px] w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-sm font-medium">Registered</th>
                <th className="px-4 py-3 text-sm font-medium">Faculty</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-t border-slate-200 text-slate-900"
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {guest.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {guest.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatDate(guest.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {guest.faculty?.name ? (
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-slate-50 text-slate-700"
                      >
                        {guest.faculty.name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
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
    </main>
  );
}
