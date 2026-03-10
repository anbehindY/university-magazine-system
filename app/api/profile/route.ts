import { getCurrentUser } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET - Return current user profile info
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch full user record from DB to get facultyId (not on session type)
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      facultyId: true,
      faculty: { select: { name: true } },
    },
  });

  const facultyName = dbUser?.faculty?.name ?? null;

  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      facultyName,
    },
  });
}

// PUT - Update display name
const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = nameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });

    return NextResponse.json({ success: true, name: updatedUser.name });
  } catch (error) {
    console.error("Name update failed:", error);
    return NextResponse.json(
      { error: "Failed to update name. Please try again." },
      { status: 500 }
    );
  }
}

// POST - Change password with current password verification
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
      select: { password: true },
    });

    if (!account?.password) {
      return NextResponse.json(
        { error: "No credential account found" },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword({
      hash: account.password,
      password: parsed.data.currentPassword,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(parsed.data.newPassword);
    await prisma.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change failed:", error);
    return NextResponse.json(
      { error: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}
