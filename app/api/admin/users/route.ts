import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = [
  "MARKETING_MANAGER",
  "MARKETING_COORDINATOR",
  "STUDENT",
  "ADMINISTRATOR",
  "GUEST",
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

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
        sessions: {
          select: {
            updatedAt: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const usersWithLastActive = users.map((user) => ({
      ...user,
      lastActiveAt: user.sessions[0]?.updatedAt ?? null,
      sessions: undefined,
    }));

    return NextResponse.json({ users: usersWithLastActive }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
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

    const body = await req.json();
    const action = normalizeText(body?.action);
    const id = normalizeText(body?.id);
    const name = normalizeText(body?.name);
    const email = normalizeEmail(body?.email);
    const role = parseRole(body?.role);
    const facultyId = normalizeText(body?.facultyId) || null;

    if (!id) {
      return NextResponse.json(
        { error: "User id is required." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (action === "deactivate" || action === "reactivate") {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          banned: action === "deactivate",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          banned: true,
          createdAt: true,
          faculty: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (action === "deactivate") {
        await prisma.session.deleteMany({
          where: { userId: id },
        });
      }

      return NextResponse.json({ user: updatedUser }, { status: 200 });
    }

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "User name, email, and role are required." },
        { status: 400 }
      );
    }

    if (
      (role === "MARKETING_COORDINATOR" ||
        role === "GUEST" ||
        role === "STUDENT") &&
      !facultyId
    ) {
      return NextResponse.json(
        { error: "Faculty is required for this role." },
        { status: 400 }
      );
    }

    const duplicateEmailUser = await prisma.user.findFirst({
      where: {
        id: { not: id },
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicateEmailUser) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        facultyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
        faculty: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
