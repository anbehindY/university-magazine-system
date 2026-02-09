import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Get the session from Better Auth
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Check if user is authenticated and is an administrator
    if (!session?.user || session.user.role !== "ADMINISTRATOR") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, facultyId } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate faculty requirement for coordinators and guests
    if (
      (role === "MARKETING_COORDINATOR" || role === "GUEST") &&
      !facultyId
    ) {
      return NextResponse.json(
        { error: "Faculty is required for coordinators and guests" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Create user using Better Auth's signup
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    if (!result || !result.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Update user with role and facultyId
    const updatedUser = await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role,
        facultyId: facultyId || null,
      },
      include: {
        faculty: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          faculty: updatedUser.faculty,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
