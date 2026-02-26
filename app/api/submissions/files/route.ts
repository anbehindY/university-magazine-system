import { auth } from "@/lib/auth";
import { isPastFinalClosure } from "@/lib/closure-guard";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type SubmissionFilePayload = {
  submissionId?: string;
  files?: {
    url: string;
    pathname: string;
    contentType?: string | null;
    size?: number | null;
  }[];
};

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
        { error: "Submissions are locked. The final closure date has passed." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as SubmissionFilePayload;

    if (!body.submissionId || !body.files || body.files.length === 0) {
      return NextResponse.json({ error: "Missing file data" }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: body.submissionId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    await prisma.submissionFile.createMany({
      data: body.files.map((file) => ({
        submissionId: body.submissionId!,
        url: file.url,
        pathname: file.pathname,
        contentType: file.contentType ?? null,
        size: file.size ?? null,
      })),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error saving submission files:", error);
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

    if (await isPastFinalClosure()) {
      return NextResponse.json(
        { error: "Submissions are locked. The final closure date has passed." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json({ error: "Missing file id" }, { status: 400 });
    }

    const file = await prisma.submissionFile.findFirst({
      where: {
        id: body.id,
        submission: {
          userId: session.user.id,
        },
      },
      select: { id: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await prisma.submissionFile.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting submission file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
