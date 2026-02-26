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

    if (session.user.role !== "MARKETING_MANAGER") {
      return NextResponse.json(
        { error: "Forbidden. Marketing Manager access required." },
        { status: 403 }
      );
    }

    const facultyIdParam = req.nextUrl.searchParams.get("facultyId");
    const facultyId = facultyIdParam ?? undefined;

    const submissions = await prisma.submission.findMany({
      where: {
        isSelected: true,
        ...(facultyId ? { facultyId } : {}),
      },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        facultyId: true,
        user: { select: { name: true } },
        _count: { select: { files: true } },
      },
    });

    const faculties = await prisma.faculty.findMany({
      select: { id: true, name: true },
    });

    const facultyMap = new Map<string, string>(
      faculties.map((f) => [f.id, f.name])
    );

    const result = submissions
      .map((s) => ({
        id: s.id,
        title: s.title,
        studentName: s.user.name,
        facultyName:
          (s.facultyId ? facultyMap.get(s.facultyId) : undefined) ??
          s.facultyId ??
          "",
        submittedAt: s.submittedAt,
        fileCount: s._count.files,
      }))
      .sort((a, b) => {
        const facultyCompare = a.facultyName.localeCompare(b.facultyName);
        if (facultyCompare !== 0) return facultyCompare;
        // descending by submittedAt within each faculty
        return (
          new Date(b.submittedAt ?? 0).getTime() -
          new Date(a.submittedAt ?? 0).getTime()
        );
      });

    return NextResponse.json({ submissions: result });
  } catch (error) {
    console.error("Error fetching manager submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
