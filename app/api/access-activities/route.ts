import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json().catch(() => ({}))) as {
      activityType?: string;
    };
    const activityType = payload.activityType?.toUpperCase();
    if (activityType !== "LOGOUT") {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    await prisma.$executeRaw`
      INSERT INTO "access_activity" ("id", "user_id", "user_name", "user_email", "activity_type", "created_at")
      VALUES (${crypto.randomUUID()}, ${session.user.id}, ${session.user.name ?? "Unknown"}, ${session.user.email}, ${activityType}, ${new Date()})
    `;

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save access activity" }, { status: 500 });
  }
}
