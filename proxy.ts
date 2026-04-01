import { betterFetch } from "@better-fetch/fetch";
import { NextRequest, NextResponse } from "next/server";

type AppRole =
  | "ADMINISTRATOR"
  | "MARKETING_MANAGER"
  | "MARKETING_COORDINATOR"
  | "STUDENT"
  | "GUEST";

type SessionUser = {
  role?: string | null;
  mustChangePassword?: boolean | null;
};

type AuthSessionResponse = {
  user?: SessionUser | null;
};

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

function matchesAnyPath(pathname: string, routes: string[]) {
  return routes.some((route) => matchesPath(pathname, route));
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

  if (role === "ADMINISTRATOR") {
    return matchesAnyPath(pathname, [
      "/",
      "/profile",
      "/reports",
      "/admin",
    ]);
  }

  if (role === "MARKETING_MANAGER") {
    return matchesAnyPath(pathname, [
      "/",
      "/profile",
      "/manager",
      "/reports",
      "/admin/analytics",
    ]);
  }

  if (role === "MARKETING_COORDINATOR") {
    return matchesAnyPath(pathname, [
      "/",
      "/profile",
      "/coordinator",
      "/reports",
    ]);
  }

  if (role === "STUDENT") {
    return matchesAnyPath(pathname, ["/", "/profile", "/student"]);
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname === "/sign-in" || pathname === "/register" || pathname === "/change-password";

  const { data: sessionData } = await betterFetch<AuthSessionResponse>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    },
  );

  const user = sessionData?.user ?? null;

  if (!user) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const role = user.role;
  const userHome = getRoleHome(role);
  const mustChangePassword = Boolean(user.mustChangePassword);

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
