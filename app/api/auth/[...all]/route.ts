import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

function isSignUpRequest(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  return pathname.includes("/api/auth/sign-up");
}

export async function POST(req: NextRequest) {
  if (isSignUpRequest(req)) {
    return NextResponse.json(
      { error: "Sign up is disabled. Contact an administrator." },
      { status: 403 }
    );
  }

  return handler.POST(req);
}

export async function GET(req: NextRequest) {
  return handler.GET(req);
}
