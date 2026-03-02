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
    const academicYearIdParam = req.nextUrl.searchParams.get("academicYearId");

    const submissions = await prisma.submission.findMany({
      where: {
        isSelected: true,
        ...(facultyId ? { facultyId } : {}),
        ...(academicYearIdParam ? { academicYearId: academicYearIdParam } : {}),
      },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        facultyId: true,
        academicYearId: true,
        user: { select: { name: true } },
        _count: { select: { files: true } },
      },
    });

    const [faculties, academicYears, activeYear] = await Promise.all([
      prisma.faculty.findMany({ select: { id: true, name: true } }),
      prisma.academicYear.findMany({
        select: { id: true, yearLabel: true, isActive: true },
        orderBy: { yearLabel: "desc" },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
        select: { finalClosureDate: true },
      }),
    ]);

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
        academicYearId: s.academicYearId,
      }))
      .sort((a, b) => {
        const facultyCompare = a.facultyName.localeCompare(b.facultyName);
        if (facultyCompare !== 0) return facultyCompare;
        return (
          new Date(b.submittedAt ?? 0).getTime() -
          new Date(a.submittedAt ?? 0).getTime()
        );
      });

    return NextResponse.json({
      submissions: result,
      academicYears,
      finalClosureDate: activeYear?.finalClosureDate ?? null,
    });
  } catch (error) {
    console.error("Error fetching manager submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
