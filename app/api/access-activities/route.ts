import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10) || 1
    );
    const pageSize = (() => {
      const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
      return [5, 10, 25, 50].includes(raw) ? raw : 10;
    })();
    const skip = (page - 1) * pageSize;

    const [total, rows, latestLogins] = await Promise.all([
      prisma.accessActivity.count({
        where: { userId: session.user.id },
      }),
      prisma.accessActivity.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip,
      }),
      prisma.accessActivity.findMany({
        where: { userId: session.user.id, activityType: "LOGIN" },
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      entries: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        activityType: row.activityType,
        createdAt: row.createdAt,
      })),
      previousLoginAt: latestLogins[1]?.createdAt ?? null,
      total,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load access activities" },
      { status: 500 }
    );
  }
}

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
