import { auth } from "@/lib/auth";
import { isPastFinalClosure } from "@/lib/closure-guard";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/comments
 *
 * Creates a comment on a submission (COMM-01, COMM-02, COMM-04).
 *
 * Guard order:
 * 1. Auth — 401 if no session
 * 2. Final closure — 403 if finalClosureDate has passed
 * 3. Body validation — 400 if submissionId or content missing
 * 4. Submission lookup — 404 if not found
 * 5. Role-based scope enforcement
 *    - MARKETING_COORDINATOR: faculty must match submission.facultyId
 *    - STUDENT: must own the submission AND must provide parentId (reply-only)
 *    - Any other role: 403
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (await isPastFinalClosure()) {
      return NextResponse.json(
        { error: "Comments are locked. The final closure date has passed." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      submissionId?: string;
      content?: string;
      parentId?: string | null;
    };

    const { submissionId, content, parentId } = body;

    if (!submissionId || typeof submissionId !== "string") {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ error: "Missing or empty content" }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true, facultyId: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const role = session.user.role;

    if (role === "MARKETING_COORDINATOR") {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { facultyId: true },
      });

      if (dbUser?.facultyId !== submission.facultyId) {
        return NextResponse.json(
          { error: "Forbidden: cross-faculty access" },
          { status: 403 }
        );
      }
    } else if (role === "STUDENT") {
      if (submission.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: not your submission" },
          { status: 403 }
        );
      }

      if (!parentId) {
        return NextResponse.json(
          { error: "Students can only reply to existing comments" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (parentId) {
      const parentComment = await prisma.submissionComment.findUnique({
        where: { id: parentId },
        select: { submissionId: true },
      });

      if (!parentComment || parentComment.submissionId !== submissionId) {
        return NextResponse.json(
          { error: "Parent comment not found on this submission" },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.submissionComment.create({
      data: {
        submissionId,
        authorId: session.user.id,
        authorRole: session.user.role as string,
        body: content,
        parentId: parentId ?? null,
      },
      include: {
        author: { select: { name: true, role: true } },
      },
    });

    // Auto-transition reviewStatus to COMMENTED when coordinator comments
    if (role === "MARKETING_COORDINATOR") {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { reviewStatus: "COMMENTED" },
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error in comments POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comments?submissionId=X
 *
 * Returns the full comment thread for a submission (COMM-03).
 *
 * Visibility rules:
 * - MARKETING_COORDINATOR: must be in the same faculty as the submission
 * - Any user: must own the submission
 * - All others: 403
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { userId: true, facultyId: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const role = session.user.role;

    if (role === "MARKETING_COORDINATOR") {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { facultyId: true },
      });

      if (dbUser?.facultyId !== submission.facultyId) {
        return NextResponse.json(
          { error: "Forbidden: cross-faculty access" },
          { status: 403 }
        );
      }
    } else if (submission.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [comments, locked] = await Promise.all([
      prisma.submissionComment.findMany({
        where: { submissionId },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      }),
      isPastFinalClosure(),
    ]);

    return NextResponse.json({ comments, isLocked: locked });
  } catch (error) {
    console.error("Error in comments GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
