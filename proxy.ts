import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    const { data: session } = await betterFetch<Session>(
      "/api/auth/get-session",
      {
        baseURL: request.nextUrl.origin,
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    // Redirect to sign-in if not authenticated
    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Role check is handled in the page component
    // since we can't access Prisma in Edge Runtime
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
