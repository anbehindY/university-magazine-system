import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/client";
import { getActiveAcademicYear } from "@/lib/closure-guard";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type StatsRow = {
  faculty_id: string;
  submission_count: bigint;
  distinct_contributors: bigint;
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role gate: students cannot access reports
    if (session.user.role === "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden. Students cannot access reports." },
        { status: 403 }
      );
    }

    // Faculty scoping: coordinator and guest see their faculty only
    let scopedFacultyId: string | null = null;
    if (
      session.user.role === "MARKETING_COORDINATOR" ||
      session.user.role === "GUEST"
    ) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { facultyId: true },
      });
      if (!dbUser?.facultyId) {
        return NextResponse.json(
          { error: "Forbidden. No faculty assigned." },
          { status: 403 }
        );
      }
      scopedFacultyId = dbUser.facultyId;
    }
    // MARKETING_MANAGER and ADMINISTRATOR: scopedFacultyId stays null (see all)

    // Parse query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const academicYearIdParam = searchParams.get("academicYearId");
    const overdue = searchParams.get("overdue");

    if (!type || (type !== "submissions" && type !== "exceptions")) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid type parameter. Must be 'submissions' or 'exceptions'.",
        },
        { status: 400 }
      );
    }

    // Resolve academic year
    let academicYearId: string;
    if (academicYearIdParam) {
      academicYearId = academicYearIdParam;
    } else {
      const activeYear = await getActiveAcademicYear();
      if (!activeYear) {
        return NextResponse.json(
          { error: "No active academic year found." },
          { status: 400 }
        );
      }
      academicYearId = activeYear.id;
    }

    // Fetch all faculty names for name resolution (shared by both report types)
    const faculties = await prisma.faculty.findMany({
      select: { id: true, name: true },
    });
    const facultyMap = new Map(faculties.map((f) => [f.id, f.name]));

    if (type === "submissions") {
      // Statistical report (RPT-01, RPT-02, RPT-03)
      const whereClause = scopedFacultyId
        ? Prisma.sql`AND s.faculty_id = ${scopedFacultyId}`
        : Prisma.empty;

      const yearClause = Prisma.sql`AND s.academic_year_id = ${academicYearId}`;

      const rows = await prisma.$queryRaw<StatsRow[]>`
        SELECT
          s.faculty_id,
          COUNT(s.id)               AS submission_count,
          COUNT(DISTINCT s.user_id) AS distinct_contributors
        FROM "submission" s
        WHERE s.status = 'SUBMITTED'
        ${whereClause}
        ${yearClause}
        GROUP BY s.faculty_id
      `;

      // Convert BigInt to Number before JSON serialization
      const total = rows.reduce(
        (sum, row) => sum + Number(row.submission_count),
        0
      );

      const data = rows.map((row) => {
        const submissionCount = Number(row.submission_count);
        const percentageOfTotal =
          total > 0
            ? Math.round((submissionCount / total) * 1000) / 10
            : 0;
        return {
          facultyId: row.faculty_id,
          facultyName: facultyMap.get(row.faculty_id) ?? null,
          submissionCount,
          percentageOfTotal,
          distinctContributors: Number(row.distinct_contributors),
        };
      });

      return NextResponse.json({
        type: "submissions",
        academicYearId,
        data,
      });
    }

    if (type === "exceptions") {
      // Exception report (RPT-04, RPT-05)
      const exceptions = await prisma.submission.findMany({
        where: {
          status: "SUBMITTED",
          ...(scopedFacultyId ? { facultyId: scopedFacultyId } : {}),
          ...(academicYearId ? { academicYearId } : {}),
          comments: {
            none: {
              authorRole: "MARKETING_COORDINATOR",
            },
          },
          ...(overdue === "true"
            ? {
                submittedAt: {
                  lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                },
              }
            : {}),
        },
        select: {
          id: true,
          title: true,
          submittedAt: true,
          facultyId: true,
          user: { select: { name: true } },
        },
        orderBy: { submittedAt: "asc" },
      });

      const now = Date.now();
      const data = exceptions.map((e) => ({
        id: e.id,
        title: e.title,
        studentName: e.user.name,
        facultyName: facultyMap.get(e.facultyId ?? "") ?? null,
        submittedAt: e.submittedAt,
        daysSinceSubmission: e.submittedAt
          ? Math.floor(
              (now - e.submittedAt.getTime()) / (24 * 60 * 60 * 1000)
            )
          : null,
      }));

      return NextResponse.json({
        type: "exceptions",
        academicYearId,
        overdue: overdue === "true",
        data,
      });
    }
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
