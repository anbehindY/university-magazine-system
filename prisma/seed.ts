import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { PrismaClient, Role } from "./generated/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });
const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "STUDENT",
      adminRoles: ["ADMINISTRATOR"],
      roles: {
        ADMINISTRATOR: adminAc,
        MARKETING_MANAGER: userAc,
        MARKETING_COORDINATOR: userAc,
        STUDENT: userAc,
        GUEST: userAc,
      },
    }),
  ],
});

// Helper to create a user via better-auth and update role/faculty
async function ensureUser(
  email: string,
  name: string,
  role: Role,
  facultyId: string | null,
  password = "password"
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    if (!result?.user) throw new Error(`Failed to create user ${email}`);
  }
  await prisma.user.update({
    where: { email },
    data: { role, emailVerified: true, facultyId },
  });
  const user = await prisma.user.findUnique({ where: { email } });
  return user!;
}

async function main() {
  console.log("Seeding database...");

  // ── Faculties ──────────────────────────────────────────────
  const facultyNames = [
    "Faculty of Engineering",
    "Faculty of Business",
    "Faculty of Arts and Humanities",
    "Faculty of Science",
    "Faculty of Medicine",
  ];

  for (const name of facultyNames) {
    await prisma.faculty.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Faculties seeded.");

  const facultyRecords = await prisma.faculty.findMany({
    select: { id: true, name: true },
  });
  const fac = Object.fromEntries(
    facultyRecords.map((f) => [f.name, f.id])
  ) as Record<string, string>;

  // ── Academic Years ─────────────────────────────────────────
  const academicYears = [
    {
      yearLabel: "2023-2024",
      isActive: false,
      firstClosureDate: new Date("2024-03-15T23:59:59Z"),
      finalClosureDate: new Date("2024-04-15T23:59:59Z"),
      startDate: new Date("2023-09-01"),
      endDate: new Date("2024-08-31"),
    },
    {
      yearLabel: "2024-2025",
      isActive: false,
      firstClosureDate: new Date("2025-03-15T23:59:59Z"),
      finalClosureDate: new Date("2025-04-15T23:59:59Z"),
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-08-31"),
    },
    {
      yearLabel: "2025-2026",
      isActive: true,
      firstClosureDate: new Date("2026-03-15T23:59:59Z"),
      finalClosureDate: new Date("2026-04-15T23:59:59Z"),
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-08-31"),
    },
  ];

  const yearIds: Record<string, string> = {};
  for (const ay of academicYears) {
    const existing = await prisma.academicYear.findFirst({
      where: { yearLabel: ay.yearLabel },
    });
    if (existing) {
      await prisma.academicYear.update({
        where: { id: existing.id },
        data: {
          isActive: ay.isActive,
          firstClosureDate: ay.firstClosureDate,
          finalClosureDate: ay.finalClosureDate,
        },
      });
      yearIds[ay.yearLabel] = existing.id;
    } else {
      const record = await prisma.academicYear.create({ data: ay });
      yearIds[ay.yearLabel] = record.id;
    }
  }
  console.log("Academic years seeded (2023-2024, 2024-2025, 2025-2026 active).");

  // ── Default Admin ──────────────────────────────────────────
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminName = process.env.DEFAULT_ADMIN_NAME || "Default Admin";

  if (adminEmail && adminPassword) {
    await ensureUser(adminEmail, adminName, "ADMINISTRATOR", null, adminPassword);
    console.log(`Default admin ensured: ${adminEmail}`);
  }

  // ── Users ──────────────────────────────────────────────────
  // Admins
  await ensureUser("sarah.johnson@uog.com", "Sarah Johnson", "ADMINISTRATOR", fac["Faculty of Business"]);

  // Marketing Managers
  const michael = await ensureUser("michael.chen@uog.com", "Michael Chen", "MARKETING_MANAGER", null);

  // Coordinators — one per faculty for full coverage
  const jessica = await ensureUser("jessica.williams@uog.com", "Jessica Williams", "MARKETING_COORDINATOR", fac["Faculty of Science"]);
  const coordEng = await ensureUser("tom.baker@uog.com", "Tom Baker", "MARKETING_COORDINATOR", fac["Faculty of Engineering"]);
  const coordArts = await ensureUser("lisa.nguyen@uog.com", "Lisa Nguyen", "MARKETING_COORDINATOR", fac["Faculty of Arts and Humanities"]);
  const coordBiz = await ensureUser("james.taylor@uog.com", "James Taylor", "MARKETING_COORDINATOR", fac["Faculty of Business"]);
  const coordMed = await ensureUser("anna.patel@uog.com", "Anna Patel", "MARKETING_COORDINATOR", fac["Faculty of Medicine"]);

  // Guests — one per faculty
  await ensureUser("priya.shah@uog.com", "Priya Shah", "GUEST", fac["Faculty of Medicine"]);
  await ensureUser("guest.eng@uog.com", "Robert Kim", "GUEST", fac["Faculty of Engineering"]);
  await ensureUser("guest.sci@uog.com", "Maria Garcia", "GUEST", fac["Faculty of Science"]);

  // Students — spread across faculties
  const students = [
    { email: "emily.rodriguez@uog.com", name: "Emily Rodriguez", faculty: "Faculty of Arts and Humanities" },
    { email: "david.park@uog.com", name: "David Park", faculty: "Faculty of Engineering" },
    { email: "alice.wong@uog.com", name: "Alice Wong", faculty: "Faculty of Science" },
    { email: "bob.smith@uog.com", name: "Bob Smith", faculty: "Faculty of Science" },
    { email: "charlie.brown@uog.com", name: "Charlie Brown", faculty: "Faculty of Engineering" },
    { email: "diana.lee@uog.com", name: "Diana Lee", faculty: "Faculty of Business" },
    { email: "ethan.moore@uog.com", name: "Ethan Moore", faculty: "Faculty of Medicine" },
    { email: "fiona.clark@uog.com", name: "Fiona Clark", faculty: "Faculty of Arts and Humanities" },
    { email: "george.white@uog.com", name: "George White", faculty: "Faculty of Medicine" },
    { email: "hannah.jones@uog.com", name: "Hannah Jones", faculty: "Faculty of Business" },
    { email: "ivan.petrov@uog.com", name: "Ivan Petrov", faculty: "Faculty of Engineering" },
    { email: "julia.santos@uog.com", name: "Julia Santos", faculty: "Faculty of Science" },
  ];

  const studentUsers: Record<string, { id: string; name: string; facultyId: string }> = {};
  for (const s of students) {
    const user = await ensureUser(s.email, s.name, "STUDENT", fac[s.faculty]);
    studentUsers[s.email] = { id: user.id, name: user.name, facultyId: fac[s.faculty] };
  }
  console.log("Users seeded (admin, manager, 5 coordinators, 3 guests, 12 students).");

  // ── Helper: create a submission with files and optional comments ──
  async function createSubmission(opts: {
    userId: string;
    facultyId: string;
    academicYearId: string;
    title: string;
    status: "DRAFT" | "SUBMITTED";
    submittedAt?: Date;
    isSelected?: boolean;
    selectedById?: string;
    notes?: string;
    fileCount?: number;
    comments?: { authorId: string; authorRole: string; body: string; replies?: { authorId: string; authorRole: string; body: string }[] }[];
  }) {
    const existing = await prisma.submission.findFirst({
      where: { title: opts.title, userId: opts.userId, academicYearId: opts.academicYearId },
    });
    if (existing) return existing;

    const submission = await prisma.submission.create({
      data: {
        userId: opts.userId,
        facultyId: opts.facultyId,
        academicYearId: opts.academicYearId,
        title: opts.title,
        status: opts.status,
        agreed: opts.status === "SUBMITTED",
        submittedAt: opts.submittedAt ?? null,
        isSelected: opts.isSelected ?? false,
        selectedAt: opts.isSelected ? new Date() : null,
        selectedById: opts.isSelected ? (opts.selectedById ?? michael.id) : null,
        notes: opts.notes ?? null,
      },
    });

    // Create fake files
    const fileCount = opts.fileCount ?? (opts.status === "SUBMITTED" ? 2 : 1);
    for (let i = 0; i < fileCount; i++) {
      await prisma.submissionFile.create({
        data: {
          submissionId: submission.id,
          url: `https://storage.example.com/files/${submission.id}/file-${i + 1}.pdf`,
          pathname: `submissions/${submission.id}/file-${i + 1}.pdf`,
          contentType: "application/pdf",
          size: Math.floor(Math.random() * 5000000) + 100000,
        },
      });
    }

    // Create comments
    if (opts.comments) {
      for (const c of opts.comments) {
        const comment = await prisma.submissionComment.create({
          data: {
            submissionId: submission.id,
            authorId: c.authorId,
            authorRole: c.authorRole,
            body: c.body,
          },
        });
        if (c.replies) {
          for (const r of c.replies) {
            await prisma.submissionComment.create({
              data: {
                submissionId: submission.id,
                authorId: r.authorId,
                authorRole: r.authorRole,
                body: r.body,
                parentId: comment.id,
              },
            });
          }
        }
      }
    }

    return submission;
  }

  // ── 2023-2024 Submissions (past year — all closed) ─────────
  const y2324 = yearIds["2023-2024"];
  const stu = studentUsers;

  await createSubmission({
    userId: stu["david.park@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2324,
    title: "Autonomous Drone Navigation Systems", status: "SUBMITTED",
    submittedAt: new Date("2024-02-20T10:00:00Z"), isSelected: true,
    notes: "Excellent research on pathfinding algorithms.",
  });
  await createSubmission({
    userId: stu["charlie.brown@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2324,
    title: "3D-Printed Prosthetic Limbs", status: "SUBMITTED",
    submittedAt: new Date("2024-03-01T14:00:00Z"), isSelected: true,
  });
  await createSubmission({
    userId: stu["ivan.petrov@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2324,
    title: "Solar Panel Efficiency Study", status: "SUBMITTED",
    submittedAt: new Date("2024-03-10T09:00:00Z"), isSelected: false,
  });
  await createSubmission({
    userId: stu["emily.rodriguez@uog.com"].id, facultyId: fac["Faculty of Arts and Humanities"], academicYearId: y2324,
    title: "The Evolution of Street Art in Southeast Asia", status: "SUBMITTED",
    submittedAt: new Date("2024-02-25T11:00:00Z"), isSelected: true,
  });
  await createSubmission({
    userId: stu["alice.wong@uog.com"].id, facultyId: fac["Faculty of Science"], academicYearId: y2324,
    title: "CRISPR Gene Editing in Marine Biology", status: "SUBMITTED",
    submittedAt: new Date("2024-03-05T08:00:00Z"), isSelected: true,
  });
  await createSubmission({
    userId: stu["diana.lee@uog.com"].id, facultyId: fac["Faculty of Business"], academicYearId: y2324,
    title: "Startup Ecosystem Analysis: London vs Berlin", status: "SUBMITTED",
    submittedAt: new Date("2024-02-28T16:00:00Z"), isSelected: false,
  });

  console.log("2023-2024 submissions seeded (6 submissions).");

  // ── 2024-2025 Submissions (previous year — closed) ─────────
  const y2425 = yearIds["2024-2025"];

  await createSubmission({
    userId: stu["david.park@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2425,
    title: "AI-Powered Traffic Management", status: "SUBMITTED",
    submittedAt: new Date("2025-02-15T10:00:00Z"), isSelected: true,
    notes: "Strong methodology and results.",
  });
  await createSubmission({
    userId: stu["charlie.brown@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2425,
    title: "Biodegradable Packaging Materials", status: "SUBMITTED",
    submittedAt: new Date("2025-03-01T12:00:00Z"), isSelected: false,
  });
  await createSubmission({
    userId: stu["alice.wong@uog.com"].id, facultyId: fac["Faculty of Science"], academicYearId: y2425,
    title: "Quantum Computing Error Correction", status: "SUBMITTED",
    submittedAt: new Date("2025-02-20T09:00:00Z"), isSelected: true,
  });
  await createSubmission({
    userId: stu["bob.smith@uog.com"].id, facultyId: fac["Faculty of Science"], academicYearId: y2425,
    title: "Microplastics in Freshwater Ecosystems", status: "SUBMITTED",
    submittedAt: new Date("2025-03-10T14:00:00Z"), isSelected: true,
    notes: "Compelling data on environmental impact.",
  });
  await createSubmission({
    userId: stu["emily.rodriguez@uog.com"].id, facultyId: fac["Faculty of Arts and Humanities"], academicYearId: y2425,
    title: "Digital Preservation of Indigenous Languages", status: "SUBMITTED",
    submittedAt: new Date("2025-02-18T11:00:00Z"), isSelected: true,
  });
  await createSubmission({
    userId: stu["fiona.clark@uog.com"].id, facultyId: fac["Faculty of Arts and Humanities"], academicYearId: y2425,
    title: "The Impact of Social Media on Political Discourse", status: "SUBMITTED",
    submittedAt: new Date("2025-03-05T16:00:00Z"), isSelected: false,
  });
  await createSubmission({
    userId: stu["ethan.moore@uog.com"].id, facultyId: fac["Faculty of Medicine"], academicYearId: y2425,
    title: "Telemedicine Adoption in Rural Communities", status: "SUBMITTED",
    submittedAt: new Date("2025-02-22T10:00:00Z"), isSelected: true,
  });
  await createSubmission({
    userId: stu["hannah.jones@uog.com"].id, facultyId: fac["Faculty of Business"], academicYearId: y2425,
    title: "ESG Investing and Market Performance", status: "SUBMITTED",
    submittedAt: new Date("2025-03-08T09:00:00Z"), isSelected: true,
  });

  console.log("2024-2025 submissions seeded (8 submissions).");

  // ── 2025-2026 Submissions (current active year) ────────────
  const y2526 = yearIds["2025-2026"];

  // Engineering — mix of submitted, selected, drafts
  await createSubmission({
    userId: stu["david.park@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2526,
    title: "Machine Learning for Structural Health Monitoring", status: "SUBMITTED",
    submittedAt: new Date("2026-01-15T10:00:00Z"), isSelected: true,
    selectedById: michael.id,
    notes: "Outstanding work on bridge monitoring systems.",
    fileCount: 3,
    comments: [
      {
        authorId: coordEng.id, authorRole: "MARKETING_COORDINATOR",
        body: "This is a very well-structured submission. The methodology section is particularly strong.",
        replies: [
          { authorId: stu["david.park@uog.com"].id, authorRole: "STUDENT", body: "Thank you! I spent extra time on the methodology based on last year's feedback." },
        ],
      },
      {
        authorId: coordEng.id, authorRole: "MARKETING_COORDINATOR",
        body: "Selected for publication — excellent contribution to the magazine.",
      },
    ],
  });
  await createSubmission({
    userId: stu["charlie.brown@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2526,
    title: "Sustainable Concrete Using Recycled Aggregates", status: "SUBMITTED",
    submittedAt: new Date("2026-01-20T14:00:00Z"), isSelected: false,
    fileCount: 2,
    comments: [
      {
        authorId: coordEng.id, authorRole: "MARKETING_COORDINATOR",
        body: "Interesting topic, but could you provide more data on the compressive strength tests?",
      },
    ],
  });
  await createSubmission({
    userId: stu["ivan.petrov@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2526,
    title: "Wind Turbine Blade Optimization", status: "SUBMITTED",
    submittedAt: new Date("2026-02-05T09:00:00Z"), isSelected: true,
    selectedById: michael.id,
    fileCount: 2,
  });
  await createSubmission({
    userId: stu["ivan.petrov@uog.com"].id, facultyId: fac["Faculty of Engineering"], academicYearId: y2526,
    title: "Draft: Hydrogen Fuel Cell Efficiency", status: "DRAFT",
    fileCount: 1,
  });

  // Science
  await createSubmission({
    userId: stu["alice.wong@uog.com"].id, facultyId: fac["Faculty of Science"], academicYearId: y2526,
    title: "Neural Network Approaches to Protein Folding", status: "SUBMITTED",
    submittedAt: new Date("2026-01-10T08:00:00Z"), isSelected: true,
    selectedById: michael.id,
    notes: "Groundbreaking work deserving of wider recognition.",
    fileCount: 4,
    comments: [
      {
        authorId: jessica.id, authorRole: "MARKETING_COORDINATOR",
        body: "This is one of the strongest submissions we've received. The neural network architecture is novel.",
        replies: [
          { authorId: stu["alice.wong@uog.com"].id, authorRole: "STUDENT", body: "Thanks Jessica! Happy to present this at the upcoming faculty seminar if needed." },
        ],
      },
    ],
  });
  await createSubmission({
    userId: stu["bob.smith@uog.com"].id, facultyId: fac["Faculty of Science"], academicYearId: y2526,
    title: "Climate Change Effects on Coral Reef Biodiversity", status: "SUBMITTED",
    submittedAt: new Date("2026-01-25T14:00:00Z"), isSelected: false,
    fileCount: 2,
  });
  await createSubmission({
    userId: stu["julia.santos@uog.com"].id, facultyId: fac["Faculty of Science"], academicYearId: y2526,
    title: "Dark Matter Detection Using Gravitational Lensing", status: "SUBMITTED",
    submittedAt: new Date("2026-02-10T11:00:00Z"), isSelected: true,
    selectedById: michael.id,
    fileCount: 3,
    comments: [
      {
        authorId: jessica.id, authorRole: "MARKETING_COORDINATOR",
        body: "Fascinating research. Please ensure all images are high-resolution for print.",
      },
    ],
  });

  // Arts and Humanities
  await createSubmission({
    userId: stu["emily.rodriguez@uog.com"].id, facultyId: fac["Faculty of Arts and Humanities"], academicYearId: y2526,
    title: "Reimagining Public Spaces Through Community Murals", status: "SUBMITTED",
    submittedAt: new Date("2026-01-18T11:00:00Z"), isSelected: true,
    selectedById: michael.id,
    fileCount: 5,
    comments: [
      {
        authorId: coordArts.id, authorRole: "MARKETING_COORDINATOR",
        body: "Beautiful portfolio pieces. The before/after photos are compelling.",
        replies: [
          { authorId: stu["emily.rodriguez@uog.com"].id, authorRole: "STUDENT", body: "I have additional high-res photos if you'd like more options for the layout." },
        ],
      },
    ],
  });
  await createSubmission({
    userId: stu["fiona.clark@uog.com"].id, facultyId: fac["Faculty of Arts and Humanities"], academicYearId: y2526,
    title: "AI-Generated Art and Copyright Challenges", status: "SUBMITTED",
    submittedAt: new Date("2026-02-01T16:00:00Z"), isSelected: false,
    fileCount: 2,
    // No comments — this will show as an exception in reports
  });

  // Business
  await createSubmission({
    userId: stu["diana.lee@uog.com"].id, facultyId: fac["Faculty of Business"], academicYearId: y2526,
    title: "Remote Work Productivity: A Two-Year Study", status: "SUBMITTED",
    submittedAt: new Date("2026-01-22T16:00:00Z"), isSelected: true,
    selectedById: michael.id,
    notes: "Great data-driven analysis with compelling conclusions.",
    fileCount: 2,
    comments: [
      {
        authorId: coordBiz.id, authorRole: "MARKETING_COORDINATOR",
        body: "Excellent research with solid statistical backing. Selected for the magazine.",
      },
    ],
  });
  await createSubmission({
    userId: stu["hannah.jones@uog.com"].id, facultyId: fac["Faculty of Business"], academicYearId: y2526,
    title: "Cryptocurrency Regulation Frameworks Comparison", status: "SUBMITTED",
    submittedAt: new Date("2026-02-08T09:00:00Z"), isSelected: false,
    fileCount: 1,
    // No comments — exception for reports
  });

  // Medicine
  await createSubmission({
    userId: stu["ethan.moore@uog.com"].id, facultyId: fac["Faculty of Medicine"], academicYearId: y2526,
    title: "Mental Health Support Systems in Medical Education", status: "SUBMITTED",
    submittedAt: new Date("2026-01-12T10:00:00Z"), isSelected: true,
    selectedById: michael.id,
    fileCount: 2,
    comments: [
      {
        authorId: coordMed.id, authorRole: "MARKETING_COORDINATOR",
        body: "Very relevant topic. This should resonate with a wide audience.",
        replies: [
          { authorId: stu["ethan.moore@uog.com"].id, authorRole: "STUDENT", body: "I agree — happy to contribute a shorter summary for the newsletter too." },
        ],
      },
    ],
  });
  await createSubmission({
    userId: stu["george.white@uog.com"].id, facultyId: fac["Faculty of Medicine"], academicYearId: y2526,
    title: "Wearable Devices for Early Disease Detection", status: "SUBMITTED",
    submittedAt: new Date("2026-02-14T12:00:00Z"), isSelected: false,
    fileCount: 3,
    comments: [
      {
        authorId: coordMed.id, authorRole: "MARKETING_COORDINATOR",
        body: "Promising research. Can you add a section on data privacy considerations?",
      },
    ],
  });

  console.log("2025-2026 submissions seeded (13 submissions with comments and files).");
  console.log("");
  console.log("Summary:");
  console.log("  Academic Years: 3 (2023-2024, 2024-2025, 2025-2026 active)");
  console.log("  Faculties: 5");
  console.log("  Users: ~22 (1 admin, 1 manager, 5 coordinators, 3 guests, 12 students)");
  console.log("  Submissions: ~27 across all years");
  console.log("  Selected: ~16 across years (for manager/guest views)");
  console.log("  Comments: multiple threads with replies");
  console.log("");
  console.log("Login credentials (all passwords: 'password'):");
  console.log("  Coordinator (Science): jessica.williams@uog.com");
  console.log("  Coordinator (Eng):     tom.baker@uog.com");
  console.log("  Manager:               michael.chen@uog.com");
  console.log("  Guest (Medicine):      priya.shah@uog.com");
  console.log("  Guest (Engineering):   guest.eng@uog.com");
  console.log("  Student:               david.park@uog.com");
  console.log("");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
