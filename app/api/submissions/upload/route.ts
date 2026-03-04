import { auth } from "@/lib/auth";
import { isPastFinalClosure } from "@/lib/closure-guard";
import prisma from "@/lib/prisma";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type UploadConfig = {
  enableUploads: boolean;
  maxUploadSizeMb: number;
  maxFilesPerUpload: number;
  allowedFileTypes: string[];
};

async function getUploadConfig(): Promise<UploadConfig> {
  const rows = await prisma.configSetting.findMany({
    where: {
      key: { in: ["enable_uploads", "max_upload_size_mb", "max_files_per_upload", "allowed_file_types"] },
    },
    select: { key: true, value: true },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const parsedAllowedFileTypes = m.allowed_file_types
    ? m.allowed_file_types.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
    : ["DOC", "DOCX"];

  return {
    enableUploads: m.enable_uploads !== "false",
    maxUploadSizeMb: Number(m.max_upload_size_mb) || 25,
    maxFilesPerUpload: Number(m.max_files_per_upload) || 10,
    allowedFileTypes: parsedAllowedFileTypes.length > 0 ? parsedAllowedFileTypes : ["DOC", "DOCX"],
  };
}

const EXT_TO_MIME: Record<string, string[]> = {
  DOC:  ["application/msword"],
  DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  PNG:  ["image/png"],
  JPG:  ["image/jpeg"],
  JPEG: ["image/jpeg"],
  GIF:  ["image/gif"],
  SVG:  ["image/svg+xml"],
  WEBP: ["image/webp"],
};

function extToMimeTypes(exts: string[]): string[] {
  const mimes = new Set<string>();
  for (const ext of exts) {
    const mapped = EXT_TO_MIME[ext.toUpperCase()];
    if (mapped) mapped.forEach((m) => mimes.add(m));
  }
  const result = Array.from(mimes);
  return result.length > 0
    ? result
    : ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load config once — used for early-return AND passed as closure into onBeforeGenerateToken
    const config = await getUploadConfig();

    // UPLOAD-01: enable_uploads gate — must return 403 here, not inside onBeforeGenerateToken
    // (handleUpload converts all throws to 400; this is the only place to return 403)
    if (!config.enableUploads) {
      return NextResponse.json(
        { error: "File uploads are currently disabled by the administrator." },
        { status: 403 }
      );
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

        if (await isPastFinalClosure()) {
          throw new Error("Submissions are locked. The final closure date has passed.");
        }

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

        // File count check (UPLOAD-02)
        const existingCount = await prisma.submissionFile.count({
          where: { submissionId },
        });
        if (existingCount >= config.maxFilesPerUpload) {
          throw new Error(
            `Maximum ${config.maxFilesPerUpload} files per submission allowed.`
          );
        }

        return {
          allowedContentTypes: extToMimeTypes(config.allowedFileTypes),
          maximumSizeInBytes: config.maxUploadSizeMb * 1024 * 1024,
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

        // SubmissionFile rows are created by the client via POST /api/submissions/files
        // after the upload resolves. No server-side insert here to avoid duplicates.
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
