import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextRequest, NextResponse } from "next/server";

type AppRole =
  | "ADMINISTRATOR"
  | "MARKETING_MANAGER"
  | "MARKETING_COORDINATOR"
  | "STUDENT"
  | "GUEST";

const HOME_BY_ROLE: Record<AppRole, string> = {
  ADMINISTRATOR: "/",
  MARKETING_MANAGER: "/",
  MARKETING_COORDINATOR: "/",
  STUDENT: "/",
  GUEST: "/guest",
};

function matchesPath(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getRoleHome(role?: string | null) {
  if (!role) {
    return "/sign-in";
  }
  return HOME_BY_ROLE[role as AppRole] ?? "/";
}

function canAccessPath(role: string, pathname: string) {
  if (role === "GUEST") {
    return matchesPath(pathname, "/guest");
  }

  if (matchesPath(pathname, "/guest")) {
    return false;
  }

  if (matchesPath(pathname, "/profile")) {
    return true;
  }

  if (pathname === "/") {
    return true;
  }

  if (role === "ADMINISTRATOR") {
    if (
      matchesPath(pathname, "/student") ||
      matchesPath(pathname, "/coordinator") ||
      matchesPath(pathname, "/manager")
    ) {
      return false;
    }
    return true;
  }

  if (role === "MARKETING_MANAGER") {
    if (
      matchesPath(pathname, "/student") ||
      matchesPath(pathname, "/coordinator")
    ) {
      return false;
    }
    if (matchesPath(pathname, "/admin/analytics")) {
      return true;
    }
    if (matchesPath(pathname, "/admin")) {
      return false;
    }
    if (matchesPath(pathname, "/manager") || matchesPath(pathname, "/reports")) {
      return true;
    }
    return false;
  }

  if (role === "MARKETING_COORDINATOR") {
    if (
      matchesPath(pathname, "/student") ||
      matchesPath(pathname, "/manager") ||
      matchesPath(pathname, "/admin")
    ) {
      return false;
    }
    if (matchesPath(pathname, "/coordinator") || matchesPath(pathname, "/reports")) {
      return true;
    }
    return false;
  }

  if (role === "STUDENT") {
    if (
      matchesPath(pathname, "/student") ||
      matchesPath(pathname, "/profile") ||
      pathname === "/"
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === "/sign-in" || pathname === "/register" || pathname === "/change-password";

  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );

  if (!session) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const role = session.user?.role;
  const userHome = getRoleHome(role);
  const mustChangePassword = Boolean(session.user?.mustChangePassword);

  if (mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (!mustChangePassword && pathname === "/change-password") {
    return NextResponse.redirect(new URL(userHome, request.url));
  }

  if (pathname === "/sign-in" || pathname === "/register") {
    return NextResponse.redirect(new URL(userHome, request.url));
  }

  if (!role || !canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL(userHome, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
