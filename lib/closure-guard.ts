import prisma from "@/lib/prisma";

type ActiveAcademicYear = {
  id: string;
  yearLabel: string;
  firstClosureDate: Date | null;
  finalClosureDate: Date | null;
};

/**
 * Returns the currently active academic year, or null if none is active.
 * Used by closure guard functions and by submission route handlers that need
 * the academicYearId when creating new submissions.
 */
export async function getActiveAcademicYear(): Promise<ActiveAcademicYear | null> {
  return prisma.academicYear.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      yearLabel: true,
      firstClosureDate: true,
      finalClosureDate: true,
    },
  });
}

/**
 * Returns true if the active academic year's first closure datetime has passed.
 * Returns false if there is no active year or if firstClosureDate is null.
 */
export async function isPastFirstClosure(): Promise<boolean> {
  const year = await getActiveAcademicYear();
  if (!year || year.firstClosureDate === null) {
    return false;
  }
  return Date.now() > year.firstClosureDate.getTime();
}

/**
 * Returns true if the active academic year's final closure datetime has passed.
 * Returns false if there is no active year or if finalClosureDate is null.
 */
export async function isPastFinalClosure(): Promise<boolean> {
  const year = await getActiveAcademicYear();
  if (!year || year.finalClosureDate === null) {
    return false;
  }
  return Date.now() > year.finalClosureDate.getTime();
}
