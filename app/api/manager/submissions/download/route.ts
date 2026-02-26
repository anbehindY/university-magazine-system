import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getActiveAcademicYear, isPastFinalClosure } from "@/lib/closure-guard";
import { headers } from "next/headers";
import archiver from "archiver";
import { Readable } from "stream";
import type { ReadableStream as NodeWebReadableStream } from "stream/web";

export async function GET() {
  // Guard 1: Authentication
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Guard 2: Role gate — Marketing Manager only
  if (session.user.role !== "MARKETING_MANAGER") {
    return new Response(
      JSON.stringify({ error: "Forbidden. Marketing Manager access required." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Guard 3: Inverted closure gate — this endpoint is ONLY available AFTER final closure.
  // All other closure-gated endpoints in this project block AFTER the date (preventing
  // submissions/changes post-deadline). This endpoint is the single exception: it blocks
  // BEFORE the final closure date because the ZIP represents a finalized publication-ready
  // export that should only be generated once all selection windows have closed.
  if (!(await isPastFinalClosure())) {
    return new Response(
      JSON.stringify({
        error: "Download unavailable. Final closure date has not passed.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Fetch all selected submissions with their files and submitting user
    const submissions = await prisma.submission.findMany({
      where: { isSelected: true },
      include: {
        files: true,
        user: { select: { name: true } },
      },
    });

    // Resolve faculty names via separate query + Map (facultyId is a snapshot string with no ORM relation)
    const faculties = await prisma.faculty.findMany({
      select: { id: true, name: true },
    });
    const facultyMap = new Map<string, string>(
      faculties.map((f) => [f.id, f.name])
    );

    // Create a streaming ZIP archive at compression level 6
    const archive = archiver("zip", { zlib: { level: 6 } });

    // Log archive errors without crashing the process
    archive.on("error", (err) => {
      console.error("Archive error:", err);
    });

    // IIFE: Serial blob fetching — must never use Promise.all() to avoid memory exhaustion
    // when fetching potentially large numbers of blobs from Vercel Blob Storage.
    // The IIFE feeds entries into `archive` asynchronously; archiver buffers internally
    // and the web stream reads as data becomes available.
    (async () => {
      try {
        for (const submission of submissions) {
          const facultyName =
            (submission.facultyId
              ? facultyMap.get(submission.facultyId)
              : undefined) ?? "Unknown";
          const studentName = submission.user?.name ?? "Unknown";

          for (const file of submission.files) {
            try {
              // Fetch blob content directly from stored URL (no getDownloadUrl needed)
              const res = await fetch(file.url);
              if (!res.ok || !res.body) {
                // Failed fetch: write an error marker file instead of corrupting the archive
                console.error(
                  `Failed to fetch blob: ${file.url} (${res.status})`
                );
                archive.append(
                  `Failed to download file: ${file.url} (HTTP ${res.status})`,
                  {
                    name: `${facultyName}/${studentName}/${
                      file.pathname.split("/").pop() ?? file.id
                    }.error.txt`,
                  }
                );
                continue;
              }

              const filename = file.pathname.split("/").pop() ?? file.id;
              // Bridge Web ReadableStream from fetch to Node.js Readable for archiver
              archive.append(
                Readable.fromWeb(res.body as NodeWebReadableStream),
                {
                  name: `${facultyName}/${studentName}/${filename}`,
                }
              );
            } catch (err) {
              console.error(`Error fetching blob ${file.url}:`, err);
              archive.append(`Error downloading file: ${String(err)}`, {
                name: `${facultyName}/${studentName}/${
                  file.pathname.split("/").pop() ?? file.id
                }.error.txt`,
              });
            }
          }
        }

        // Add placeholder files for faculties with no selected submissions so that
        // empty faculty folders appear in the ZIP (required by must_haves)
        const selectedFacultyIds = new Set(
          submissions.map((s) => s.facultyId).filter(Boolean)
        );
        for (const [fId, fName] of facultyMap) {
          if (!selectedFacultyIds.has(fId)) {
            archive.append("", { name: `${fName}/.gitkeep` });
          }
        }

        archive.finalize();
      } catch (err) {
        console.error("Archive assembly error:", err);
        archive.abort();
      }
    })();

    // Bridge Node.js Readable stream to Web ReadableStream.
    // Node.js v24 provides Readable.toWeb natively.
    const webStream = Readable.toWeb(archive) as unknown as ReadableStream;

    // Derive ZIP filename from active academic year label if available
    const activeYear = await getActiveAcademicYear();
    const yearLabel = activeYear?.yearLabel ?? "";
    const zipFilename = yearLabel
      ? `selected-submissions-${yearLabel}.zip`
      : "selected-submissions.zip";

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating ZIP download:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
