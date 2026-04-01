import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type FilterStatus = "all" | "selected" | "not-selected" | "no-comments";
type SortBy = "date-desc" | "date-asc" | "selected" | "no-comments-priority";

export async function GET(req: NextRequest) {
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

    // Coordinators only see submissions for the active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = (() => {
      const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
      return [10, 25, 50].includes(raw) ? raw : 10;
    })();
    const q = searchParams.get("q")?.trim() ?? "";
    const filterStatus = (() => {
      const raw = searchParams.get("filter");
      if (
        raw === "selected" ||
        raw === "not-selected" ||
        raw === "no-comments"
      ) {
        return raw;
      }
      return "all";
    })() as FilterStatus;
    const sortBy = (() => {
      const raw = searchParams.get("sort");
      if (
        raw === "date-asc" ||
        raw === "selected" ||
        raw === "no-comments-priority"
      ) {
        return raw;
      }
      return "date-desc";
    })() as SortBy;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SubmissionWhereInput = {
      status: "SUBMITTED" as const,
      facultyId: coordinatorFacultyId,
      ...(activeYear ? { academicYearId: activeYear.id } : {}),
      ...(filterStatus === "selected" ? { isSelected: true } : {}),
      ...(filterStatus === "not-selected" ? { isSelected: false } : {}),
      ...(filterStatus === "no-comments" ? { comments: { none: {} } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { user: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.SubmissionOrderByWithRelationInput[] =
      sortBy === "date-asc"
        ? [{ submittedAt: "asc" }]
        : sortBy === "selected"
          ? [{ isSelected: "desc" }, { submittedAt: "desc" }]
          : sortBy === "no-comments-priority"
            ? [{ comments: { _count: "asc" } }, { submittedAt: "asc" }]
            : [{ submittedAt: "desc" }];

    const [total, submissions] = await Promise.all([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        select: {
          id: true,
          title: true,
          status: true,
          submittedAt: true,
          isSelected: true,
          reviewStatus: true,
          notes: true,
          user: { select: { name: true } },
          files: {
            select: { id: true, url: true, pathname: true, contentType: true, size: true },
            orderBy: { createdAt: "asc" as const },
          },
          _count: { select: { files: true, comments: true } },
        },
      }),
    ]);

    const result = submissions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      studentName: s.user.name,
      submittedAt: s.submittedAt,
      isSelected: s.isSelected,
      reviewStatus: s.reviewStatus,
      notes: s.notes,
      files: s.files.map((f) => ({
        id: f.id,
        url: f.url,
        filename: f.pathname.split("/").pop() ?? f.id,
        contentType: f.contentType,
        size: f.size,
      })),
      fileCount: s._count.files,
      commentCount: s._count.comments,
    }));

    return NextResponse.json({ submissions: result, total, page, pageSize });
  } catch (error) {
    console.error("Error fetching coordinator submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
