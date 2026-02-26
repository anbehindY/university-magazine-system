import { auth } from "@/lib/auth";
import {
  getActiveAcademicYear,
  isPastFirstClosure,
  isPastFinalClosure,
} from "@/lib/closure-guard";
import { sendMail } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type SubmissionPayload = {
  id?: string;
  agreed?: boolean;
  notes?: string | null;
  status?: "DRAFT" | "SUBMITTED";
};

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        files: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SubmissionPayload;

    if (await isPastFirstClosure()) {
      return NextResponse.json(
        { error: "New submissions are no longer accepted. The first closure date has passed." },
        { status: 403 }
      );
    }

    const activeYear = await getActiveAcademicYear();
    if (!activeYear) {
      return NextResponse.json(
        { error: "No active academic year. Submissions are not open." },
        { status: 403 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { facultyId: true },
    });

    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        agreed: Boolean(body.agreed),
        notes: body.notes ?? null,
        status: body.status ?? "DRAFT",
        submittedAt: body.status === "SUBMITTED" ? new Date() : null,
        academicYearId: activeYear.id,
        facultyId: dbUser?.facultyId ?? null,
      },
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SubmissionPayload;

    if (!body.id) {
      return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
    }

    if (await isPastFinalClosure()) {
      return NextResponse.json(
        { error: "Submissions are locked. The final closure date has passed." },
        { status: 403 }
      );
    }

    const existing = await prisma.submission.findFirst({
      where: {
        id: body.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        submittedAt: true,
        agreed: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const nextStatus = body.status ?? "DRAFT";

    if (nextStatus === "SUBMITTED") {
      const effectiveAgreed = typeof body.agreed === "boolean" ? body.agreed : existing.agreed;
      if (!effectiveAgreed) {
        return NextResponse.json(
          { error: "You must accept the Terms and Conditions before submitting." },
          { status: 400 }
        );
      }
    }

    const updateData: {
      agreed?: boolean;
      notes?: string | null;
      status?: "DRAFT" | "SUBMITTED";
      submittedAt?: Date | null;
    } = {
      status: nextStatus,
      submittedAt:
        nextStatus === "SUBMITTED"
          ? existing.submittedAt ?? new Date()
          : existing.submittedAt ?? null,
    };

    if (typeof body.agreed === "boolean") {
      updateData.agreed = body.agreed;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes ?? null;
    }

    const submission = await prisma.submission.update({
      where: { id: body.id },
      data: updateData,
    });

    // COORD-02: Email notification on first SUBMITTED transition
    // Fire only when submittedAt was null before (first time) and nextStatus is SUBMITTED
    const isFirstSubmission = nextStatus === "SUBMITTED" && existing.submittedAt === null;
    if (isFirstSubmission) {
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: body.id },
        select: { facultyId: true, title: true },
      });

      if (updatedSubmission?.facultyId) {
        const coordinators = await prisma.user.findMany({
          where: {
            role: "MARKETING_COORDINATOR",
            facultyId: updatedSubmission.facultyId,
          },
          select: { email: true },
        });

        if (coordinators.length > 0) {
          const emails = coordinators.map((c) => c.email);
          const submissionTitle = updatedSubmission.title ?? "Untitled";
          const studentName = session.user.name;
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

          // Fire-and-forget — do NOT await; errors logged, not thrown
          sendMail({
            to: emails,
            subject: `New submission: ${submissionTitle} — ${studentName}`,
            html: `<p><strong>${studentName}</strong> has submitted a new contribution: <em>${submissionTitle}</em>.</p>
                   <p><a href="${appUrl}/coordinator/submissions">View submissions</a></p>`,
            text: `${studentName} has submitted a new contribution: ${submissionTitle}. Visit ${appUrl}/coordinator/submissions to review.`,
          }).catch(console.error);
        }
      }
    }

    return NextResponse.json({ submission }, { status: 200 });
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: body.id,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (submission.status === "SUBMITTED") {
      return NextResponse.json(
        { error: "Submitted submissions cannot be deleted." },
        { status: 400 }
      );
    }

    await prisma.submission.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
