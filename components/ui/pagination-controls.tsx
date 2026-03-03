"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

function buildPageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const rangeStart = Math.max(2, current - 2);
  const rangeEnd = Math.min(total - 1, current + 2);

  const pages: (number | "...")[] = [1];

  if (rangeStart > 2) {
    pages.push("...");
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < total - 1) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
}: PaginationControlsProps) {
  if (total <= pageSize) {
    return null;
  }

  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = buildPageNumbers(page, totalPages);

  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);
  const rowCountLabel =
    total === 0 ? "No results" : `${startRow}–${endRow} of ${total}`;

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      {/* Left: row count */}
      <span className="text-sm text-muted-foreground">{rowCountLabel}</span>

      {/* Right: page size selector + page buttons */}
      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Rows per page
          </span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="w-20 border-slate-200 bg-white text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-200 bg-white text-slate-900">
              {pageSizeOptions.map((opt) => (
                <SelectItem
                  key={opt}
                  value={String(opt)}
                  className="text-slate-900"
                >
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          {/* Prev button */}
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Prev
          </Button>

          {/* Numbered page buttons */}
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p as number)}
                className={
                  p === page
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }
              >
                {p}
              </Button>
            )
          )}

          {/* Next button */}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
