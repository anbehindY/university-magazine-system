import { auth } from "@/lib/auth";
import { isPastFinalClosure } from "@/lib/closure-guard";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/comments
 *
 * Phase 2 stub: enforces the final-closure gate (CLOS-03).
 * Returns 403 if finalClosureDate has passed.
 * Returns 501 for all other cases — full implementation in Phase 3.
 */
export async function POST(_req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (await isPastFinalClosure()) {
      return NextResponse.json(
        { error: "Comments are locked. The final closure date has passed." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Not implemented. Comment creation is available from Phase 3." },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error in comments route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
