import { getCurrentUser } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
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
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const hashedPassword = await hashPassword(parsed.data.newPassword);
    await prisma.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hashedPassword },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { mustChangePassword: false },
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
