import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const ALLOWED_CONTENT_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
];

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;

    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsedPayload =
          typeof clientPayload === "string"
            ? (JSON.parse(clientPayload) as { submissionId?: string })
            : (clientPayload as { submissionId?: string } | null);
        const submissionId = parsedPayload?.submissionId;

        if (!submissionId) {
          throw new Error("Missing submission id.");
        }

        if (!pathname.startsWith(`submissions/${session.user.id}/${submissionId}/`)) {
          throw new Error("Invalid upload path.");
        }

        const submission = await prisma.submission.findFirst({
          where: {
            id: submissionId,
            userId: session.user.id,
          },
          select: { id: true },
        });

        if (!submission) {
          throw new Error("Submission not found.");
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            submissionId,
            clientPayload: parsedPayload ?? clientPayload,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const parsedToken = tokenPayload ? JSON.parse(tokenPayload) as {
          userId?: string;
          submissionId?: string;
        } : {};

        if (!parsedToken.submissionId) return;

        const blobSize =
          "size" in blob && typeof (blob as { size?: unknown }).size === "number"
            ? (blob as { size: number }).size
            : null;
        await prisma.submissionFile.create({
          data: {
            submissionId: parsedToken.submissionId,
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType ?? null,
            size: blobSize,
          },
        });
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
