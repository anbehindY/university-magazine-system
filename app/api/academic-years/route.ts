import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();

    const academicYear =
      (await prisma.academicYear.findFirst({
        where: {
          closureDate: {
            gte: today,
          },
        },
        orderBy: {
          closureDate: "asc",
        },
        select: {
          yearLabel: true,
          closureDate: true,
          endDate: true,
        },
      })) ??
      (await prisma.academicYear.findFirst({
        where: {
          endDate: {
            gte: today,
          },
        },
        orderBy: {
          endDate: "asc",
        },
        select: {
          yearLabel: true,
          closureDate: true,
          endDate: true,
        },
      })) ??
      (await prisma.academicYear.findFirst({
        orderBy: {
          endDate: "desc",
        },
        select: {
          yearLabel: true,
          closureDate: true,
          endDate: true,
        },
      }));

    return NextResponse.json({ academicYear }, { status: 200 });
  } catch (error) {
    console.error("Error fetching academic year:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
