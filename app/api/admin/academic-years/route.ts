import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type AcademicYearPayload = {
  yearLabel?: string;
  firstClosureDate?: string | null;
  finalClosureDate?: string | null;
  isActive?: boolean;
};

function parseDateTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * A year can only be activated if it covers the current or a future calendar year.
 * yearLabel format: "2025-2026" — we parse the start year and compare to current year.
 * e.g. in 2026: "2025-2026" OK, "2026-2027" OK, "2024-2025" rejected.
 */
function canActivateYear(yearLabel: string): boolean {
  const match = yearLabel.match(/^(\d{4})-(\d{4})$/);
  if (!match) return false;
  const startYear = parseInt(match[1], 10);
  const currentYear = new Date().getFullYear();
  return startYear >= currentYear - 1;
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
    const firstClosureDate = parseDateTime(body.firstClosureDate);
    const finalClosureDate = parseDateTime(body.finalClosureDate);

    if (!body.yearLabel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        yearLabel: body.yearLabel,
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
    const firstClosureDate = parseDateTime(body.firstClosureDate);
    const finalClosureDate = parseDateTime(body.finalClosureDate);

    if (!body.id || !body.yearLabel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let academicYear;

    if (body.isActive) {
      if (!canActivateYear(body.yearLabel)) {
        return NextResponse.json(
          { error: "Cannot activate a past academic year. Only current or upcoming years can be set as active." },
          { status: 400 }
        );
      }

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
      // Validate the year is current or upcoming before activation
      const record = await prisma.academicYear.findUnique({
        where: { id: body.id },
        select: { yearLabel: true },
      });
      if (!record || !canActivateYear(record.yearLabel)) {
        return NextResponse.json(
          { error: "Cannot activate a past academic year. Only current or upcoming years can be set as active." },
          { status: 400 }
        );
      }

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
