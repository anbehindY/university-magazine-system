import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [academicYear, allYears] = await Promise.all([
      prisma.academicYear.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          yearLabel: true,
          firstClosureDate: true,
          finalClosureDate: true,
          isActive: true,
        },
      }),
      prisma.academicYear.findMany({
        select: { id: true, yearLabel: true, isActive: true },
        orderBy: { yearLabel: "desc" },
      }),
    ]);

    return NextResponse.json({ academicYear, allYears }, { status: 200 });
  } catch (error) {
    console.error("Error fetching academic year:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
