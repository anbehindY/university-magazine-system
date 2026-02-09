"use client";

import { getSession, useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionDetails = {
  user: Record<string, unknown>;
  session: Record<string, unknown>;
};

type SessionResponseShape = {
  data?: SessionDetails | null;
  error?: { message?: string };
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sessionInfo, setSessionInfo] = useState<SessionDetails | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (isPending || !session?.user) return;

    let cancelled = false;
    async function loadSession() {
      setSessionError(null);
      const res = (await getSession()) as
        | SessionResponseShape
        | SessionDetails
        | null;
      const response = (res ?? null) as
        | SessionResponseShape
        | SessionDetails
        | null;
      const hasWrappedShape =
        !!response &&
        typeof response === "object" &&
        ("data" in response || "error" in response);
      const data = hasWrappedShape
        ? ((response as SessionResponseShape).data ?? null)
        : (response as SessionDetails | null);
      const error = hasWrappedShape
        ? (response as SessionResponseShape).error
        : undefined;

      if (cancelled) return;

      if (error) {
        setSessionError(error?.message || "Failed to load session.");
        setSessionInfo(null);
        return;
      }

      setSessionInfo(data);
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [isPending, session?.user]);

  if (isPending)
    return <p className="text-center mt-8 text-white">Loading...</p>;
  if (!session?.user)
    return <p className="text-center mt-8 text-white">Redirecting...</p>;

  const { user } = session;
  const userSessionFields = sessionInfo?.user
    ? Object.entries(sessionInfo.user as Record<string, unknown>)
    : [];
  const authSessionFields = sessionInfo?.session
    ? Object.entries(sessionInfo.session as Record<string, unknown>)
    : [];

  function formatFieldValue(value: unknown) {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return "[object]";
    return String(value);
  }

  return (
    <main className="max-w-2xl flex items-center justify-center flex-col mx-auto p-6 space-y-4 text-white">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome, {user.name || "User"}!</p>
    </main>
  );
}
