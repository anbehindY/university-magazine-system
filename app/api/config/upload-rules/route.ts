import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const ENFORCED_KEYS = [
  "enable_uploads",
  "max_upload_size_mb",
  "max_files_per_upload",
  "allowed_file_types",
] as const;

export async function GET() {
  try {
    const rows = await prisma.configSetting.findMany({
      where: { key: { in: [...ENFORCED_KEYS] } },
      select: { key: true, value: true },
    });

    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const parsedAllowedFileTypes = m.allowed_file_types
      ? m.allowed_file_types.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean)
      : ["DOC", "DOCX"];

    return NextResponse.json({
      enableUploads: m.enable_uploads !== "false",
      maxUploadSizeMb: Number(m.max_upload_size_mb) || 25,
      maxFilesPerUpload: Number(m.max_files_per_upload) || 10,
      allowedFileTypes: parsedAllowedFileTypes.length > 0 ? parsedAllowedFileTypes : ["DOC", "DOCX"],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load upload rules" },
      { status: 500 }
    );
  }
}
