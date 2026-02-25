import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type AcademicYearPayload = {
  yearLabel?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  notiMessage?: string;
  firstClosureDate?: string;
  finalClosureDate?: string;
  isActive?: boolean;
  automatic?: boolean;
  reason?: string;
};

function parseDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTime(value?: string) {
  if (!value) return null;
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const parsed = new Date(`1970-01-01T${value}:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator access required." },
        { status: 403 }
      );
    }

    const academicYears = await prisma.academicYear.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        yearLabel: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        notiMessage: true,
        firstClosureDate: true,
        finalClosureDate: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ academicYears }, { status: 200 });
  } catch (error) {
    console.error("Error fetching academic years:", error);
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

    if (!session?.user || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator access required." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as AcademicYearPayload;
    const startDate = parseDate(body.startDate);
    const endDate = parseDate(body.endDate);
    const startTime = parseTime(body.startTime);
    const endTime = parseTime(body.endTime);
    const firstClosureDate = parseDate(body.firstClosureDate);
    const finalClosureDate = parseDate(body.finalClosureDate);

    if (
      !body.yearLabel ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !body.notiMessage
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        yearLabel: body.yearLabel,
        startDate,
        endDate,
        startTime,
        endTime,
        notiMessage: body.notiMessage,
        firstClosureDate,
        finalClosureDate,
        updatedById: session.user.id,
      },
    });

    return NextResponse.json({ academicYear }, { status: 201 });
  } catch (error) {
    console.error("Error creating academic year:", error);
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

    if (!session?.user || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator access required." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as AcademicYearPayload & { id?: string };
    const startDate = parseDate(body.startDate);
    const endDate = parseDate(body.endDate);
    const startTime = parseTime(body.startTime);
    const endTime = parseTime(body.endTime);
    const firstClosureDate = parseDate(body.firstClosureDate);
    const finalClosureDate = parseDate(body.finalClosureDate);

    if (
      !body.id ||
      !body.yearLabel ||
      !startDate ||
      !endDate ||
      !startTime ||
      !endTime ||
      !body.notiMessage
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let academicYear;

    if (body.isActive) {
      // Enforce single-active-year invariant using a transaction
      [, academicYear] = await prisma.$transaction([
        prisma.academicYear.updateMany({
          where: { id: { not: body.id } },
          data: { isActive: false },
        }),
        prisma.academicYear.update({
          where: { id: body.id },
          data: {
            yearLabel: body.yearLabel,
            startDate,
            endDate,
            startTime,
            endTime,
            notiMessage: body.notiMessage,
            firstClosureDate,
            finalClosureDate,
            isActive: true,
            updatedById: session.user.id,
          },
        }),
      ]);
    } else {
      academicYear = await prisma.academicYear.update({
        where: { id: body.id },
        data: {
          yearLabel: body.yearLabel,
          startDate,
          endDate,
          startTime,
          endTime,
          notiMessage: body.notiMessage,
          firstClosureDate,
          finalClosureDate,
          isActive: false,
          updatedById: session.user.id,
        },
      });
    }

    return NextResponse.json({ academicYear }, { status: 200 });
  } catch (error) {
    console.error("Error updating academic year:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator access required." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { id?: string; isActive?: boolean };

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing record id" },
        { status: 400 }
      );
    }

    let academicYear;

    if (body.isActive === true) {
      // Enforce single-active-year invariant using a transaction
      [, academicYear] = await prisma.$transaction([
        prisma.academicYear.updateMany({
          where: { id: { not: body.id } },
          data: { isActive: false },
        }),
        prisma.academicYear.update({
          where: { id: body.id },
          data: { isActive: true, updatedById: session.user.id },
        }),
      ]);
    } else {
      academicYear = await prisma.academicYear.update({
        where: { id: body.id },
        data: { isActive: false, updatedById: session.user.id },
      });
    }

    return NextResponse.json({ academicYear }, { status: 200 });
  } catch (error) {
    console.error("Error patching academic year:", error);
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

    if (!session?.user || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator access required." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as { id?: string };

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing record id" },
        { status: 400 }
      );
    }

    await prisma.academicYear.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting academic year:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
