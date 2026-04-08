"use client";

export default function PortalLoading() {
  return (
    <main className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-80 animate-pulse rounded bg-slate-100" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-slate-100" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-slate-100" />
    </main>
  );
}
