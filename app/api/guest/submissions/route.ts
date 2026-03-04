import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "GUEST") {
      return NextResponse.json(
        { error: "Forbidden. Guest access required." },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { facultyId: true },
    });

    if (!dbUser?.facultyId) {
      return NextResponse.json(
        { error: "Forbidden. Guest has no assigned faculty." },
        { status: 403 }
      );
    }

    const guestFacultyId = dbUser.facultyId;
    const yearId = request.nextUrl.searchParams.get("yearId");

    const [faculty, availableYears] = await Promise.all([
      prisma.faculty.findUnique({
        where: { id: guestFacultyId },
        select: { name: true },
      }),
      prisma.academicYear.findMany({
        where: {
          submissions: {
            some: {
              isSelected: true,
              facultyId: guestFacultyId,
            },
          },
        },
        select: { id: true, yearLabel: true, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Determine the effective targetYearId
    let targetYearId: string | null = null;
    if (yearId && availableYears.some((y) => y.id === yearId)) {
      targetYearId = yearId;
    } else {
      const activeYear = availableYears.find((y) => y.isActive);
      if (activeYear) {
        targetYearId = activeYear.id;
      } else if (availableYears.length > 0) {
        targetYearId = availableYears[0].id;
      }
    }

    // If no targetYearId, return empty submissions
    if (!targetYearId) {
      return NextResponse.json({
        submissions: [],
        facultyName: faculty?.name ?? "Unknown Faculty",
        academicYearLabel: null,
        availableYears,
        selectedYearId: null,
      });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        isSelected: true,
        facultyId: guestFacultyId,
        academicYearId: targetYearId,
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        notes: true,
        user: { select: { name: true } },
        files: {
          select: {
            id: true,
            url: true,
            pathname: true,
            contentType: true,
            size: true,
          },
        },
        _count: { select: { files: true } },
      },
    });

    const result = submissions.map((s) => ({
      id: s.id,
      title: s.title,
      studentName: s.user.name,
      submittedAt: s.submittedAt,
      fileCount: s._count.files,
      description: s.notes,
      files: s.files,
    }));

    const selectedYear = availableYears.find((y) => y.id === targetYearId);

    return NextResponse.json({
      submissions: result,
      facultyName: faculty?.name ?? "Unknown Faculty",
      academicYearLabel: selectedYear?.yearLabel ?? null,
      availableYears,
      selectedYearId: targetYearId,
    });
  } catch (error) {
    console.error("Error fetching guest submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
