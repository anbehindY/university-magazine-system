export default function AuthLoading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <div className="w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-8">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
      </div>
    </main>
  );
}
