import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const uploadRuleKeys = [
  "enable_uploads",
  "virus_scanning",
  "require_auth",
  "auto_delete",
  "max_upload_size_mb",
  "max_files_per_upload",
  "allowed_file_types",
] as const;

type UploadRuleKey = (typeof uploadRuleKeys)[number];

type UploadRulePayload = {
  settings?: Record<string, string>;
};

function isUploadRuleKey(key: string): key is UploadRuleKey {
  return uploadRuleKeys.includes(key as UploadRuleKey);
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

    const settings = await prisma.configSetting.findMany({
      where: {
        key: {
          in: uploadRuleKeys.slice(),
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const mapped = settings.reduce<Record<string, string>>((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    return NextResponse.json({ settings: mapped }, { status: 200 });
  } catch (error) {
    console.error("Error fetching upload rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
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

    const body = (await req.json()) as UploadRulePayload;
    const settings = body.settings ?? {};
    const entries = Object.entries(settings).filter(([key]) => isUploadRuleKey(key));

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No valid upload rule settings provided." },
        { status: 400 }
      );
    }

    const data = entries.map(([key, value]) => ({
      key,
      value,
      type: key.includes("_size") || key.includes("_files") ? "integer" : "boolean",
      description: null,
      updatedById: session.user.id,
    }));

    for (const item of data) {
      if (item.key === "allowed_file_types") {
        item.type = "string";
      }
    }

    await prisma.$transaction([
      prisma.configSetting.deleteMany({
        where: {
          key: {
            in: uploadRuleKeys.slice(),
          },
        },
      }),
      prisma.configSetting.createMany({
        data,
      }),
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating upload rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
