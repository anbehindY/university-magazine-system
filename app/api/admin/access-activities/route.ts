import { requireRole } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { authorized, error } = await requireRole([
      "ADMINISTRATOR",
      "MARKETING_MANAGER",
    ]);
    if (!authorized) {
      return NextResponse.json(
        { error: error ?? "Unauthorized" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? "1", 10) || 1
    );
    const pageSize = (() => {
      const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
      return [10, 25, 50].includes(raw) ? raw : 10;
    })();
    const skip = (page - 1) * pageSize;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const whereClause =
      fromDate && toDate
        ? Prisma.sql`WHERE created_at >= ${fromDate} AND created_at <= ${toDate}`
        : fromDate
          ? Prisma.sql`WHERE created_at >= ${fromDate}`
          : toDate
            ? Prisma.sql`WHERE created_at <= ${toDate}`
            : Prisma.empty;

    const [countRows, rows] = await Promise.all([
      prisma.$queryRaw<{ total: number }[]>`
        SELECT COUNT(*)::int AS total
        FROM "access_activity"
        ${whereClause}
      `,
      prisma.$queryRaw<
        {
          id: string;
          user_id: string;
          user_name: string;
          user_email: string;
          activity_type: string;
          created_at: Date;
        }[]
      >`
        SELECT id, user_id, user_name, user_email, activity_type, created_at
        FROM "access_activity"
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `,
    ]);

    const entries = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      activityType: row.activity_type,
      createdAt: row.created_at,
    }));
    const total = countRows[0]?.total ?? 0;

    return NextResponse.json({ entries, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching access activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
