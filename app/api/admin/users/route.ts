import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/prisma/generated/client";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VALID_ROLES = [
  "MARKETING_MANAGER",
  "MARKETING_COORDINATOR",
  "STUDENT",
  "ADMINISTRATOR",
  "GUEST",
] as const;
const VALID_ROLE_FILTERS = [...VALID_ROLES] as const;

type ValidRole = (typeof VALID_ROLES)[number];
type ValidRoleFilter = (typeof VALID_ROLE_FILTERS)[number];
type SortField = "LAST_ACTIVE" | "NAME" | "EMAIL" | "ROLE" | "STATUS";
type SortDirection = "asc" | "desc";
type FilterStatus = "ACTIVE" | "PENDING" | "INACTIVE";

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

function parseRoleFilter(value: unknown): ValidRoleFilter | null {
  if (typeof value !== "string") return null;
  return VALID_ROLE_FILTERS.includes(value as ValidRoleFilter)
    ? (value as ValidRoleFilter)
    : null;
}

function parseStatus(value: string | null): FilterStatus | null {
  if (value === "ACTIVE" || value === "PENDING" || value === "INACTIVE") {
    return value;
  }
  return null;
}

function parseSort(value: string | null): {
  field: SortField;
  direction: SortDirection;
} {
  const normalized = (value ?? "LAST_ACTIVE_DESC").toUpperCase();
  const [field, direction] = normalized.split("_");
  const parsedField: SortField =
    field === "NAME" ||
    field === "EMAIL" ||
    field === "ROLE" ||
    field === "STATUS" ||
    field === "LAST"
      ? field === "LAST"
        ? "LAST_ACTIVE"
        : (field as SortField)
      : "LAST_ACTIVE";
  const parsedDirection: SortDirection = direction === "ASC" ? "asc" : "desc";

  if (normalized === "LAST_ACTIVE_ASC" || normalized === "LAST_ACTIVE_DESC") {
    return {
      field: "LAST_ACTIVE",
      direction: normalized.endsWith("_ASC") ? "asc" : "desc",
    };
  }

  return { field: parsedField, direction: parsedDirection };
}

function getStatusRank(user: { banned: boolean | null; emailVerified: boolean }) {
  if (user.banned) return 2;
  if (!user.emailVerified) return 1;
  return 0;
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = (() => {
      const raw = parseInt(searchParams.get("pageSize") ?? "10", 10);
      return [10, 25, 50].includes(raw) ? raw : 10;
    })();
    const search = normalizeEmail(searchParams.get("search"));
    const roleFilter = parseRoleFilter(searchParams.get("role"));
    const statusFilter = parseStatus(searchParams.get("status"));
    const { field: sortField, direction: sortDirection } = parseSort(
      searchParams.get("sortBy")
    );
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.email = {
        contains: search,
        mode: "insensitive",
      };
    }
    if (roleFilter) {
      where.role = roleFilter;
    }
    if (statusFilter === "ACTIVE") {
      where.banned = { not: true };
      where.emailVerified = true;
    }
    if (statusFilter === "PENDING") {
      where.banned = { not: true };
      where.emailVerified = false;
    }
    if (statusFilter === "INACTIVE") {
      where.banned = true;
    }
    const select = {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      banned: true,
      createdAt: true,
      lastLoginAt: true,
      sessions: {
        select: {
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc" as const,
        },
        take: 1,
      },
      faculty: {
        select: {
          id: true,
          name: true,
        },
      },
    };

    let total = 0;
    let users: Array<{
      id: string;
      name: string;
      email: string;
      role: string | null;
      emailVerified: boolean;
      banned: boolean | null;
      createdAt: Date;
      lastLoginAt: Date | null;
      sessions: { updatedAt: Date }[];
      faculty: { id: string; name: string } | null;
    }> = [];

    if (sortField === "STATUS" || sortField === "LAST_ACTIVE") {
      const allUsers = await prisma.user.findMany({
        where,
        select,
      });
      const sorted = [...allUsers].sort((a, b) => {
        if (sortField === "STATUS") {
          const statusDiff = getStatusRank(a) - getStatusRank(b);
          if (statusDiff !== 0) {
            return sortDirection === "asc" ? statusDiff : -statusDiff;
          }
        }
        const aLastActive =
          a.sessions[0]?.updatedAt?.getTime() ?? a.lastLoginAt?.getTime() ?? 0;
        const bLastActive =
          b.sessions[0]?.updatedAt?.getTime() ?? b.lastLoginAt?.getTime() ?? 0;
        const lastActiveDiff = aLastActive - bLastActive;
        if (lastActiveDiff !== 0) {
          return sortDirection === "asc" ? lastActiveDiff : -lastActiveDiff;
        }
        const createdAtDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (createdAtDiff !== 0) {
          return sortDirection === "asc" ? createdAtDiff : -createdAtDiff;
        }
        return a.id.localeCompare(b.id);
      });
      total = sorted.length;
      users = sorted.slice(skip, skip + pageSize);
    } else {
      const orderBy =
        sortField === "NAME"
          ? [{ name: sortDirection }, { id: "asc" as const }]
          : sortField === "EMAIL"
            ? [{ email: sortDirection }, { id: "asc" as const }]
            : [{ role: sortDirection }, { id: "asc" as const }];

      const [count, pagedUsers] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          skip,
          take: pageSize,
          orderBy,
          select,
        }),
      ]);
      total = count;
      users = pagedUsers;
    }

    const usersWithLastActive = users.map((user) => {
      const { sessions, ...rest } = user;
      return {
        ...rest,
        lastActiveAt: sessions[0]?.updatedAt ?? user.lastLoginAt ?? null,
      };
    });

    return NextResponse.json(
      { users: usersWithLastActive, total, page, pageSize },
      { status: 200 }
    );
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
    const password = normalizeText(body?.password);
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

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

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

    const userUpdateData = {
      name,
      email,
      role,
      facultyId,
    };

    if (password) {
      const credentialAccount = await prisma.account.findFirst({
        where: { userId: id, providerId: "credential" },
        select: { id: true },
      });

      if (!credentialAccount) {
        return NextResponse.json(
          { error: "No credential account found for this user." },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(password);

      const updatedUser = await prisma.$transaction(async (tx) => {
        await tx.account.updateMany({
          where: { userId: id, providerId: "credential" },
          data: { password: hashedPassword },
        });
        await tx.session.deleteMany({
          where: { userId: id },
        });
        return tx.user.update({
          where: { id },
          data: {
            ...userUpdateData,
            mustChangePassword: role !== "GUEST",
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
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000";
      sendMail({
        to: updatedUser.email,
        subject: "Your University Magazine System password was reset",
        html: `<p>Hello ${updatedUser.name},</p>
               <p>Your account password has been updated by an administrator.</p>
               <p><strong>Email:</strong> ${updatedUser.email}</p>
               <p><strong>Temporary password:</strong> ${password}</p>
               <p>Please sign in and change your password as soon as possible.</p>
               <p><a href="${appUrl}/sign-in">Sign in here</a></p>`,
        text: `Hello ${updatedUser.name}, your account password has been updated by an administrator.\nEmail: ${updatedUser.email}\nTemporary password: ${password}\nPlease sign in and change your password as soon as possible.\nSign in: ${appUrl}/sign-in`,
      }).catch((mailError) => {
        console.error("Failed to send password-reset email:", mailError);
      });

      return NextResponse.json({ user: updatedUser }, { status: 200 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: userUpdateData,
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
