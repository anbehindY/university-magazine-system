import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const faculties = await prisma.faculty.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ faculties });
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculties" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Faculty name is required" },
        { status: 400 }
      );
    }

    const faculty = await prisma.faculty.create({
      data: { name },
    });

    return NextResponse.json({ faculty }, { status: 201 });
  } catch (error) {
    console.error("Error creating faculty:", error);
    return NextResponse.json(
      { error: "Failed to create faculty" },
      { status: 500 }
    );
  }
}
