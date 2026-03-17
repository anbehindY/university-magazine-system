"use client";

import { LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";

function getInitials(name?: string | null) {
  if (!name) return "SJ";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

function StableAvatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const onError = useCallback(() => setFailed(true), []);

  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-400 text-xs font-semibold text-slate-900">
      {getInitials(name)}
      {!failed && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          ref={imgRef}
          src={src}
          alt={name}
          onError={onError}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

function formatRole(role: string) {
  const labels: Record<string, string> = {
    MARKETING_COORDINATOR: "Coordinator",
    MARKETING_MANAGER: "Manager",
    ADMINISTRATOR: "Admin",
    STUDENT: "Student",
    GUEST: "Guest",
  };
  return labels[role] ?? role.replaceAll("_", " ");
}

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    role?: string | null;
    facultyId?: string | null;
  };
}) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [facultyName, setFacultyName] = useState<string | null>(null);

  useEffect(() => {
    if (!user.facultyId) return;

    fetch("/api/faculties")
      .then((res) => res.json())
      .then((data: { faculties?: { id: string; name: string }[] }) => {
        const match = data.faculties?.find((f) => f.id === user.facultyId);
        if (match) setFacultyName(match.name);
      })
      .catch(() => {
        // silently ignore — faculty name is cosmetic
      });
  }, [user.facultyId]);

  async function handleSignOut() {
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
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          id="user-menu-trigger"
          className="hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none focus:outline-none"
        >
          <div>
            <StableAvatar src={user.avatar} name={user.name} />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium text-white">
                {user.name}
              </span>
              <span className="truncate text-[11px] text-white/50">
                {formatRole(user.role ?? "Administrator")}
                {facultyName ? ` · ${facultyName}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Log out"
              aria-busy={isSigningOut}
            >
              <LogOut className={isSigningOut ? "h-4 w-4 opacity-60" : "h-4 w-4"} />
            </button>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
