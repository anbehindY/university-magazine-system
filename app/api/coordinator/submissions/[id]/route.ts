import { auth } from "@/lib/auth";
import { isPastFinalClosure } from "@/lib/closure-guard";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (await isPastFinalClosure()) {
      return NextResponse.json(
        { error: "Submissions are locked. The final closure date has passed." },
        { status: 403 }
      );
    }

    const coordinatorFacultyId = dbUser.facultyId;
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { facultyId: true },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.facultyId !== coordinatorFacultyId) {
      return NextResponse.json(
        { error: "Forbidden: submission belongs to a different faculty" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      isSelected?: boolean;
      notes?: string | null;
    };

    const updateData: { isSelected?: boolean; notes?: string | null } = {};

    if (typeof body.isSelected === "boolean") {
      updateData.isSelected = body.isSelected;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes ?? null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: updateData,
      select: { id: true, isSelected: true, notes: true },
    });

    return NextResponse.json({ submission: updated });
  } catch (error) {
    console.error("Error updating coordinator submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
