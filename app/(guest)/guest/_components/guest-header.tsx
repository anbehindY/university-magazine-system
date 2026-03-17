"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

function MagazineLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="4"
        y="3"
        width="18"
        height="26"
        rx="2"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <rect
        x="10"
        y="3"
        width="18"
        height="26"
        rx="2"
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth="1"
      />
      <path
        d="M14 10h10M14 14h10M14 18h7"
        stroke="#0f172a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="9"
        cy="8"
        r="2"
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth="0.75"
      />
    </svg>
  );
}

type GuestHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    facultyId?: string | null;
  } | null;
};

export function GuestHeader({ user }: GuestHeaderProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [facultyName, setFacultyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.facultyId) return;

    fetch("/api/faculties")
      .then((res) => res.json())
      .then((data: { faculties?: { id: string; name: string }[] }) => {
        const match = data.faculties?.find((f) => f.id === user.facultyId);
        if (match) setFacultyName(match.name);
      })
      .catch(() => {
        // silently ignore -- faculty name is cosmetic
      });
  }, [user?.facultyId]);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await fetch("/api/access-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType: "LOGOUT" }),
      }).catch(() => undefined);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/sign-in";
          },
        },
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <MagazineLogo className="size-8" />
          <span className="text-sm font-bold tracking-tight text-slate-900">
            University Magazine
          </span>
        </div>

        {/* Right: User info + Sign out */}
        <div className="flex items-center gap-3">
          {facultyName && (
            <Badge
              variant="secondary"
              className="hidden sm:inline-flex bg-slate-100 text-slate-600 border-slate-200"
            >
              {facultyName}
            </Badge>
          )}
          {user?.name && (
            <span className="text-sm text-slate-600 hidden sm:inline">
              {user.name}
            </span>
          )}
          <Link
            href="/guest/profile"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Sign out"
            aria-busy={isSigningOut}
          >
            <LogOut
              className={
                isSigningOut ? "h-4 w-4 opacity-60" : "h-4 w-4"
              }
            />
          </button>
        </div>
      </div>
    </header>
  );
}
