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

    if (session.user.role !== "MARKETING_COORDINATOR") {
      return NextResponse.json(
        { error: "Forbidden. Marketing Coordinator access required." },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { facultyId: true },
    });

    if (!dbUser?.facultyId) {
      return NextResponse.json(
        { error: "Forbidden. Coordinator has no assigned faculty." },
        { status: 403 }
      );
    }

    const coordinatorFacultyId = dbUser.facultyId;

    const submissions = await prisma.submission.findMany({
      where: {
        status: "SUBMITTED",
        facultyId: coordinatorFacultyId,
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        submittedAt: true,
        isSelected: true,
        notes: true,
        user: { select: { name: true } },
        _count: { select: { files: true } },
      },
    });

    const result = submissions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      studentName: s.user.name,
      submittedAt: s.submittedAt,
      isSelected: s.isSelected,
      notes: s.notes,
      fileCount: s._count.files,
    }));

    return NextResponse.json({ submissions: result });
  } catch (error) {
    console.error("Error fetching coordinator submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
