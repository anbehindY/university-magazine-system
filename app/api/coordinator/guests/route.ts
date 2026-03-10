import { requireRole } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { authorized, user, error } = await requireRole([
      "MARKETING_COORDINATOR",
    ]);
    if (!authorized) {
      return NextResponse.json(
        { error: error ?? "Unauthorized" },
        { status: 403 }
      );
    }

    // Faculty scoping (from coordinator submissions pattern)
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: { facultyId: true },
    });
    if (!dbUser?.facultyId) {
      return NextResponse.json(
        { error: "Forbidden. Coordinator has no assigned faculty." },
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
    const q = searchParams.get("q")?.trim() ?? "";

    const where = {
      role: "GUEST" as const,
      facultyId: dbUser.facultyId,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      }),
    };

    const [total, guests] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          faculty: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({ guests, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching guest list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
