import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type FacultyStatsRow = {
  submission_count: bigint;
  distinct_contributors: bigint;
};

type TotalCountRow = {
  total_count: bigint;
};

type SubmissionPreviewRow = {
  submissionId: string;
  overview: string | null;
  contentTitles: string[] | null;
};

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
        summaryStats: { totalSubmissions: 0, percentageOfTotal: 0, distinctContributors: 0 },
      });
    }

    const [submissions, facultyStats, totalStats] = await Promise.all([
      prisma.submission.findMany({
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
          _count: { select: { files: true } },
        },
      }),
      prisma.$queryRaw<FacultyStatsRow[]>`
        SELECT
          COUNT(s.id) AS submission_count,
          COUNT(DISTINCT s.user_id) AS distinct_contributors
        FROM "submission" s
        WHERE s.status = 'SUBMITTED'
          AND s.faculty_id = ${guestFacultyId}
          AND s.academic_year_id = ${targetYearId}
      `,
      prisma.$queryRaw<TotalCountRow[]>`
        SELECT COUNT(s.id) AS total_count
        FROM "submission" s
        WHERE s.status = 'SUBMITTED'
          AND s.academic_year_id = ${targetYearId}
      `,
    ]);

    // Derive summary stats from raw query results
    const facultySubmissionCount = facultyStats.length > 0 ? Number(facultyStats[0].submission_count) : 0;
    const universityTotal = totalStats.length > 0 ? Number(totalStats[0].total_count) : 0;
    const distinctContributors = facultyStats.length > 0 ? Number(facultyStats[0].distinct_contributors) : 0;
    const percentageOfTotal = universityTotal > 0
      ? Math.round((facultySubmissionCount / universityTotal) * 1000) / 10
      : 0;

    const previewRows = (
      await Promise.all(
        submissions.map(async (submission) => {
          const rows = await prisma.$queryRaw<SubmissionPreviewRow[]>`
            SELECT
              "submission_id"::TEXT AS "submissionId",
              "overview",
              "content_titles" AS "contentTitles"
            FROM "submission_preview"
            WHERE "submission_id" = ${submission.id}
            LIMIT 1
          `;
          return rows[0] ?? null;
        })
      )
    ).filter((row): row is SubmissionPreviewRow => row !== null);
    const previewMap = new Map(
      previewRows.map((preview) => [
        preview.submissionId,
        {
          overview: preview.overview,
          contentTitles: preview.contentTitles ?? [],
        },
      ])
    );

    const result = submissions.map((s) => ({
      id: s.id,
      title: s.title,
      studentName: s.user.name,
      submittedAt: s.submittedAt,
      fileCount: s._count.files,
      description: s.notes,
      preview: previewMap.get(s.id) ?? { overview: null, contentTitles: [] },
    }));

    const selectedYear = availableYears.find((y) => y.id === targetYearId);

    return NextResponse.json({
      submissions: result,
      facultyName: faculty?.name ?? "Unknown Faculty",
      academicYearLabel: selectedYear?.yearLabel ?? null,
      availableYears,
      selectedYearId: targetYearId,
      summaryStats: {
        totalSubmissions: facultySubmissionCount,
        percentageOfTotal,
        distinctContributors,
      },
    });
  } catch (error) {
    console.error("Error fetching guest submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
