import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

    const [faculty, activeYear, submissions] = await Promise.all([
      prisma.faculty.findUnique({
        where: { id: guestFacultyId },
        select: { name: true },
      }),
      prisma.academicYear.findFirst({
        where: { isActive: true },
        select: { yearLabel: true },
      }),
      prisma.submission.findMany({
        where: {
          isSelected: true,
          facultyId: guestFacultyId,
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
      }),
    ]);

    const result = submissions.map((s) => ({
      id: s.id,
      title: s.title,
      studentName: s.user.name,
      submittedAt: s.submittedAt,
      fileCount: s._count.files,
      description: s.notes,
      files: s.files,
    }));

    return NextResponse.json({
      submissions: result,
      facultyName: faculty?.name ?? "Unknown Faculty",
      academicYearLabel: activeYear?.yearLabel ?? null,
    });
  } catch (error) {
    console.error("Error fetching guest submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
