import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        isActive: true,
      },
      select: {
        yearLabel: true,
        firstClosureDate: true,
        finalClosureDate: true,
        endDate: true,
        isActive: true,
      },
    });

    return NextResponse.json({ academicYear }, { status: 200 });
  } catch (error) {
    console.error("Error fetching academic year:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
