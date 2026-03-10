import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = [
  "MARKETING_MANAGER",
  "MARKETING_COORDINATOR",
  "STUDENT",
  "ADMINISTRATOR",
] as const;

type ValidRole = (typeof VALID_ROLES)[number];

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseRole(value: unknown): ValidRole | null {
  if (typeof value !== "string") return null;
  return VALID_ROLES.includes(value as ValidRole) ? (value as ValidRole) : null;
}

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
    const name = normalizeText(body?.name);
    const email = normalizeEmail(body?.email);
    const password = normalizeText(body?.password);
    const role = parseRole(body?.role);
    const facultyId = normalizeText(body?.facultyId) || null;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    // Validate faculty requirement for coordinators and students
    if (
      (role === "MARKETING_COORDINATOR" ||
        role === "STUDENT") &&
      !facultyId
    ) {
      return NextResponse.json(
        { error: "Faculty is required for this role." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
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
        facultyId,
        emailVerified: true,
        mustChangePassword: true,
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
