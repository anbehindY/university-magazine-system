import { auth } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password =
      typeof body?.password === "string" ? body.password.trim() : "";
    const facultyId =
      typeof body?.facultyId === "string" ? body.facultyId.trim() : "";

    if (!name || !email || !password || !facultyId) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    // Validate faculty exists
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
    });
    if (!faculty) {
      return NextResponse.json(
        { error: "Invalid faculty." },
        { status: 400 }
      );
    }

    // Check email uniqueness (server-side defense in depth)
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered." },
        { status: 409 }
      );
    }

    // Create account via Better Auth
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    if (!result?.user) {
      return NextResponse.json(
        { error: "Registration failed." },
        { status: 500 }
      );
    }

    // Set GUEST role -- HARDCODED, NEVER from request body
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role: "GUEST",
        facultyId,
        emailVerified: true,
        mustChangePassword: false,
      },
    });

    // Notify faculty coordinators (fire-and-forget)
    const coordinators = await prisma.user.findMany({
      where: { role: "MARKETING_COORDINATOR", facultyId },
      select: { email: true },
    });

    if (coordinators.length > 0) {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5000";
      sendMail({
        to: coordinators.map((c) => c.email),
        subject: `New guest registration: ${name} \u2014 ${faculty.name}`,
        html: `<p>A new guest has registered for <strong>${faculty.name}</strong>.</p>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Registered:</strong> ${new Date().toLocaleDateString()}</p>
               <p><a href="${appUrl}/coordinator/guests">View guest list</a></p>`,
        text: `New guest registration for ${faculty.name}: ${name} (${email}). View: ${appUrl}/coordinator/guests`,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error in guest registration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
