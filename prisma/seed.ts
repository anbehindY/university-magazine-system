import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { PrismaClient, Role } from "./generated/client";

// ── Prisma + Better Auth bootstrap ────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
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

// ── Real Vercel Blob file URLs ────────────────────────────────────────────────

const SAMPLE_FILES = [
  {
    url: "https://3gm2kbxaksi1lwbu.public.blob.vercel-storage.com/COMP1640_Ver2.doc",
    pathname: "COMP1640_Ver2.doc",
    contentType: "application/msword",
    size: 245760,
  },
  {
    url: "https://3gm2kbxaksi1lwbu.public.blob.vercel-storage.com/generated_image_1764010143782.png",
    pathname: "generated_image_1764010143782.png",
    contentType: "image/png",
    size: 1048576,
  },
  {
    url: "https://3gm2kbxaksi1lwbu.public.blob.vercel-storage.com/generated_image_1764010247718.png",
    pathname: "generated_image_1764010247718.png",
    contentType: "image/png",
    size: 921600,
  },
];

// ── Seed configuration ────────────────────────────────────────────────────────

faker.seed(42); // Deterministic for reproducible seeding

const FACULTY_NAMES = [
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Arts and Humanities",
  "Faculty of Science",
  "Faculty of Medicine",
];

const STUDENTS_PER_FACULTY = 20;
const DEFAULT_PASSWORD = "password";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ensureUser(
  email: string,
  name: string,
  role: Role,
  facultyId: string | null,
  password = DEFAULT_PASSWORD
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
  return (await prisma.user.findUnique({ where: { email } }))!;
}

function pickFiles(count: number) {
  const files = [];
  for (let i = 0; i < count; i++) {
    const f = SAMPLE_FILES[i % SAMPLE_FILES.length];
    files.push({ ...f });
  }
  return files;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// ── Submission titles by faculty ──────────────────────────────────────────────

const TITLES: Record<string, string[]> = {
  "Faculty of Engineering": [
    "Autonomous Drone Navigation Systems",
    "3D-Printed Prosthetic Limbs for Developing Nations",
    "Solar Panel Efficiency Optimization Using Machine Learning",
    "AI-Powered Traffic Management in Smart Cities",
    "Biodegradable Packaging from Agricultural Waste",
    "Machine Learning for Structural Health Monitoring",
    "Sustainable Concrete Using Recycled Aggregates",
    "Wind Turbine Blade Optimization with CFD Analysis",
    "Hydrogen Fuel Cell Efficiency in Cold Climates",
    "IoT-Based Water Quality Monitoring Network",
    "Robotic Arm Design for Precision Agriculture",
    "Electric Vehicle Battery Recycling Processes",
    "Earthquake-Resistant Building Foundations",
    "Smart Grid Energy Distribution Algorithms",
    "Acoustic Emission Testing for Pipeline Integrity",
    "Wearable Exoskeletons for Rehabilitation",
    "Additive Manufacturing in Aerospace Components",
    "Urban Heat Island Mitigation Strategies",
    "Bridge Load Analysis Using Digital Twins",
    "Autonomous Underwater Vehicle Navigation",
    "5G Antenna Design for Dense Urban Areas",
    "Carbon Capture Technology in Cement Plants",
    "Microfluidic Devices for Point-of-Care Diagnostics",
    "Railway Track Condition Monitoring with Sensors",
    "Vertical Farming Infrastructure Design",
    "Biomimetic Materials for Impact Protection",
    "Predictive Maintenance Using Vibration Analysis",
    "Desalination Plant Energy Optimization",
    "Quantum Computing Hardware Error Correction",
    "High-Speed Rail Aerodynamics Study",
  ],
  "Faculty of Business": [
    "Remote Work Productivity: A Three-Year Longitudinal Study",
    "Cryptocurrency Regulation Frameworks: US vs EU",
    "Startup Ecosystem Analysis: London vs Berlin vs Singapore",
    "ESG Investing and Long-Term Market Performance",
    "Supply Chain Resilience After COVID-19",
    "Digital Banking Adoption in Southeast Asia",
    "Consumer Behaviour in Subscription Economy",
    "Impact of AI on Financial Advisory Services",
    "Gender Pay Gap Analysis in FTSE 100 Companies",
    "Social Media Marketing ROI Measurement",
    "Gig Economy Worker Satisfaction Survey",
    "Corporate Governance and Stock Performance",
    "Green Marketing Strategies in Fast Fashion",
    "Microfinance Impact on Rural Entrepreneurship",
    "Blockchain in Supply Chain Transparency",
    "Cross-Cultural Leadership Styles Analysis",
    "E-commerce Customer Retention Strategies",
    "Data Privacy Compliance Costs for SMEs",
    "Post-Brexit Trade Patterns in UK Services",
    "Family Business Succession Planning Models",
    "Venture Capital Trends in Climate Tech",
    "Employee Mental Health ROI for Employers",
    "Ethical AI Governance in Banking",
    "Consumer Trust in Online Marketplaces",
    "Inflation Impact on Small Business Survival",
    "Digital Transformation in NHS Supply Chain",
    "Luxury Brand Pricing Strategy in Asia",
    "Remote Team Communication Tool Effectiveness",
    "Sustainability Reporting Standards Comparison",
    "Food Delivery Platform Market Dynamics",
  ],
  "Faculty of Arts and Humanities": [
    "The Evolution of Street Art in Southeast Asia",
    "Digital Preservation of Indigenous Languages",
    "AI-Generated Art and Copyright Challenges",
    "Reimagining Public Spaces Through Community Murals",
    "The Impact of Social Media on Political Discourse",
    "Post-Colonial Literature in Modern Curricula",
    "Oral History of Vietnamese Diaspora Communities",
    "Gender Representation in Contemporary Theatre",
    "Music Therapy Approaches for Dementia Patients",
    "Virtual Reality in Museum Curation",
    "Photography as Evidence in Human Rights Documentation",
    "Graphic Novel Storytelling in Education",
    "Heritage Building Conservation Challenges",
    "Film Censorship and Cultural Identity",
    "The Role of Podcasts in Investigative Journalism",
    "Comparative Religious Ethics in Medical Decisions",
    "Dance Movement Therapy in Youth Prisons",
    "Typography and Readability in Digital Interfaces",
    "Folklore Preservation Through Interactive Media",
    "Translating Poetry: Loss and Transformation",
    "Architectural Symbolism in Religious Spaces",
    "Street Fashion and Cultural Identity in London",
    "Documentary Ethics: Filming Vulnerable Communities",
    "Children's Literature and Climate Anxiety",
    "Sound Design in Immersive Theatre",
    "Feminist Perspectives in War Photography",
    "Comic Books as Political Commentary",
    "The Aesthetics of Brutalist Architecture Revival",
    "Craft Beer Branding and Local Identity",
    "Video Game Narratives as Modern Mythology",
  ],
  "Faculty of Science": [
    "CRISPR Gene Editing in Marine Biology Applications",
    "Quantum Computing Error Correction Algorithms",
    "Microplastics in Freshwater Ecosystems: UK Survey",
    "Neural Network Approaches to Protein Folding",
    "Climate Change Effects on Coral Reef Biodiversity",
    "Dark Matter Detection Using Gravitational Lensing",
    "Antarctic Ice Core Analysis for Climate History",
    "Machine Learning for Drug Discovery Pipelines",
    "Antibiotic Resistance Patterns in Hospital Environments",
    "Gravitational Wave Data Analysis Techniques",
    "Synthetic Biology for Biofuel Production",
    "Exoplanet Atmospheric Composition Analysis",
    "Soil Microbiome and Crop Yield Correlation",
    "Deep Learning for Weather Prediction Models",
    "Bioluminescence Mechanisms in Deep-Sea Organisms",
    "Nanoparticle Drug Delivery Systems",
    "Population Genetics of Endangered Bird Species",
    "Water Purification Using Graphene Membranes",
    "Seismic Activity Prediction Using AI",
    "Probiotic Strains for Gut Health Optimization",
    "Coral Spawning Patterns and Ocean Temperature",
    "Photovoltaic Cell Materials Research",
    "RNA Sequencing in Cancer Genomics",
    "Atmospheric Carbon Dioxide Monitoring Methods",
    "Enzyme Engineering for Industrial Applications",
    "Neutrino Mass Measurement Techniques",
    "Mycorrhizal Networks in Forest Ecosystems",
    "Plastic-Eating Bacteria Isolation and Study",
    "Tidal Energy Feasibility in Scottish Waters",
    "Genetic Markers for Alzheimer's Early Detection",
  ],
  "Faculty of Medicine": [
    "Mental Health Support Systems in Medical Education",
    "Wearable Devices for Early Disease Detection",
    "Telemedicine Adoption in Rural Communities",
    "AI-Assisted Radiology Diagnosis Accuracy",
    "Vaccine Hesitancy in University Students",
    "Burnout Prevalence Among Junior Doctors",
    "Antibiotic Stewardship Programme Outcomes",
    "Palliative Care Training for Medical Students",
    "Nutrition Education in Primary Care Settings",
    "Virtual Reality for Surgical Training",
    "Sleep Quality and Academic Performance in Medics",
    "Patient Communication Skills Assessment Tools",
    "Diabetes Management Through Mobile Apps",
    "Maternal Mental Health Screening Protocols",
    "Geriatric Care Pathway Improvements",
    "Simulation-Based Emergency Medicine Training",
    "Health Literacy and Treatment Compliance",
    "Mindfulness Interventions for Chronic Pain",
    "Medical Ethics in Genetic Testing",
    "Rural GP Recruitment and Retention Strategies",
    "Post-Surgical Infection Prevention Protocols",
    "Digital Health Records: Adoption Barriers",
    "Childhood Obesity Prevention Programmes",
    "Physiotherapy Outcomes in Knee Replacement",
    "Paediatric Asthma Management Guidelines Review",
    "Cancer Screening Uptake in Minority Communities",
    "Hand Hygiene Compliance in ICU Settings",
    "Organ Transplant Waiting List Equity Analysis",
    "Sports Medicine in Amateur Athletics",
    "Pharmacogenomics in Personalised Treatment Plans",
  ],
};

// ── Coordinator comment templates ─────────────────────────────────────────────

const COORD_COMMENTS = [
  "Excellent submission. The research methodology is solid and the conclusions are well-supported by the data.",
  "Very interesting topic. Could you expand the discussion section to address potential counterarguments?",
  "Strong writing throughout. The literature review is comprehensive and current.",
  "Good work overall. Please revise the abstract to better reflect your key findings.",
  "This is one of the strongest submissions we've received this year. Recommended for publication.",
  "The data analysis is thorough, but the visualisations could be improved for clarity.",
  "Well-structured piece. The introduction effectively sets up the research question.",
  "Interesting approach. I'd suggest adding more recent references from 2025-2026.",
  "The practical implications section is particularly compelling. Well done.",
  "Solid contribution to the field. Minor formatting adjustments needed before final publication.",
  "Impressive depth of analysis. This would benefit from a summary table of key findings.",
  "Good research question, but the methodology section needs more detail on sample selection.",
  "The comparative analysis between the two approaches is very insightful.",
  "Clear and well-argued. The case studies effectively illustrate your main points.",
  "This submission demonstrates a strong understanding of the current literature.",
];

const STUDENT_REPLIES = [
  "Thank you for the feedback! I'll make those revisions and resubmit the updated version.",
  "I appreciate the detailed comments. I'll address each point in the revised draft.",
  "Thanks for the positive feedback! Happy to present this at the faculty seminar if needed.",
  "Good point — I'll expand that section as suggested. Should have the update within a week.",
  "Thank you! I've already started working on the revisions based on your suggestions.",
  "That's a great suggestion. I'll add the additional data and update the charts.",
  "I appreciate the thorough review. Will incorporate all feedback in the next version.",
  "Thanks for highlighting that. I'll restructure the discussion section accordingly.",
];

// ── Main seed function ────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database with realistic data...\n");

  // ── 1. Faculties ──────────────────────────────────────────────────────────

  for (const name of FACULTY_NAMES) {
    await prisma.faculty.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  const facultyRecords = await prisma.faculty.findMany({ select: { id: true, name: true } });
  const fac = Object.fromEntries(facultyRecords.map((f) => [f.name, f.id])) as Record<string, string>;
  console.log(`✓ ${FACULTY_NAMES.length} faculties seeded`);

  // ── 2. Academic Years ─────────────────────────────────────────────────────

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
    const existing = await prisma.academicYear.findFirst({ where: { yearLabel: ay.yearLabel } });
    if (existing) {
      await prisma.academicYear.update({
        where: { id: existing.id },
        data: { isActive: ay.isActive, firstClosureDate: ay.firstClosureDate, finalClosureDate: ay.finalClosureDate },
      });
      yearIds[ay.yearLabel] = existing.id;
    } else {
      const record = await prisma.academicYear.create({ data: ay });
      yearIds[ay.yearLabel] = record.id;
    }
  }
  console.log("✓ 3 academic years seeded (2025-2026 active)");

  // ── 3. Admin user ─────────────────────────────────────────────────────────

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminName = process.env.DEFAULT_ADMIN_NAME || "Default Admin";

  if (adminEmail && adminPassword) {
    await ensureUser(adminEmail, adminName, "ADMINISTRATOR", null, adminPassword);
    console.log(`✓ Default admin: ${adminEmail}`);
  }

  // ── 4. Staff users ────────────────────────────────────────────────────────

  // Additional admin
  await ensureUser("sarah.johnson@uog.com", "Sarah Johnson", "ADMINISTRATOR", fac["Faculty of Business"]);

  // Marketing Manager
  const manager = await ensureUser("michael.chen@uog.com", "Michael Chen", "MARKETING_MANAGER", null);

  // Coordinators — one per faculty
  const coordinators: Record<string, { id: string; name: string }> = {};
  const coordData = [
    { email: "tom.baker@uog.com", name: "Tom Baker", faculty: "Faculty of Engineering" },
    { email: "james.taylor@uog.com", name: "James Taylor", faculty: "Faculty of Business" },
    { email: "lisa.nguyen@uog.com", name: "Lisa Nguyen", faculty: "Faculty of Arts and Humanities" },
    { email: "jessica.williams@uog.com", name: "Jessica Williams", faculty: "Faculty of Science" },
    { email: "anna.patel@uog.com", name: "Anna Patel", faculty: "Faculty of Medicine" },
  ];
  for (const c of coordData) {
    const user = await ensureUser(c.email, c.name, "MARKETING_COORDINATOR", fac[c.faculty]);
    coordinators[c.faculty] = { id: user.id, name: user.name };
  }

  // Guests — one per faculty
  const guestData = [
    { email: "guest.eng@uog.com", name: "Robert Kim", faculty: "Faculty of Engineering" },
    { email: "guest.biz@uog.com", name: "Sandra Mitchell", faculty: "Faculty of Business" },
    { email: "guest.arts@uog.com", name: "Helen Wright", faculty: "Faculty of Arts and Humanities" },
    { email: "guest.sci@uog.com", name: "Maria Garcia", faculty: "Faculty of Science" },
    { email: "priya.shah@uog.com", name: "Priya Shah", faculty: "Faculty of Medicine" },
  ];
  for (const g of guestData) {
    await ensureUser(g.email, g.name, "GUEST", fac[g.faculty]);
  }

  console.log("✓ Staff: 2 admins, 1 manager, 5 coordinators, 5 guests");

  // ── 5. Students — 20 per faculty ──────────────────────────────────────────

  const allStudents: { id: string; name: string; email: string; facultyId: string; facultyName: string }[] = [];

  // Keep a few named students for easy testing
  const namedStudents = [
    { email: "david.park@uog.com", name: "David Park", faculty: "Faculty of Engineering" },
    { email: "charlie.brown@uog.com", name: "Charlie Brown", faculty: "Faculty of Engineering" },
    { email: "ivan.petrov@uog.com", name: "Ivan Petrov", faculty: "Faculty of Engineering" },
    { email: "alice.wong@uog.com", name: "Alice Wong", faculty: "Faculty of Science" },
    { email: "bob.smith@uog.com", name: "Bob Smith", faculty: "Faculty of Science" },
    { email: "julia.santos@uog.com", name: "Julia Santos", faculty: "Faculty of Science" },
    { email: "emily.rodriguez@uog.com", name: "Emily Rodriguez", faculty: "Faculty of Arts and Humanities" },
    { email: "fiona.clark@uog.com", name: "Fiona Clark", faculty: "Faculty of Arts and Humanities" },
    { email: "diana.lee@uog.com", name: "Diana Lee", faculty: "Faculty of Business" },
    { email: "hannah.jones@uog.com", name: "Hannah Jones", faculty: "Faculty of Business" },
    { email: "ethan.moore@uog.com", name: "Ethan Moore", faculty: "Faculty of Medicine" },
    { email: "george.white@uog.com", name: "George White", faculty: "Faculty of Medicine" },
  ];

  // Track how many named students per faculty
  const namedPerFaculty: Record<string, number> = {};
  for (const s of namedStudents) {
    namedPerFaculty[s.faculty] = (namedPerFaculty[s.faculty] || 0) + 1;
  }

  // Create named students
  for (const s of namedStudents) {
    const user = await ensureUser(s.email, s.name, "STUDENT", fac[s.faculty]);
    allStudents.push({ id: user.id, name: user.name, email: s.email, facultyId: fac[s.faculty], facultyName: s.faculty });
  }

  // Generate remaining students with faker
  for (const facultyName of FACULTY_NAMES) {
    const existing = namedPerFaculty[facultyName] || 0;
    const remaining = STUDENTS_PER_FACULTY - existing;

    for (let i = 0; i < remaining; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@uog.com`;

      const user = await ensureUser(email, name, "STUDENT", fac[facultyName]);
      allStudents.push({ id: user.id, name: user.name, email, facultyId: fac[facultyName], facultyName: facultyName });
    }
  }

  console.log(`✓ ${allStudents.length} students seeded (${STUDENTS_PER_FACULTY} per faculty)`);

  // Group students by faculty for easy access
  const studentsByFaculty: Record<string, typeof allStudents> = {};
  for (const s of allStudents) {
    if (!studentsByFaculty[s.facultyName]) studentsByFaculty[s.facultyName] = [];
    studentsByFaculty[s.facultyName].push(s);
  }

  // ── 6. Helper: create a submission ────────────────────────────────────────

  let submissionCount = 0;
  let commentCount = 0;

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
    comments?: {
      authorId: string;
      authorRole: string;
      body: string;
      createdAt?: Date;
      replies?: { authorId: string; authorRole: string; body: string; createdAt?: Date }[];
    }[];
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
        selectedAt: opts.isSelected ? (opts.submittedAt ? new Date(opts.submittedAt.getTime() + 3 * 24 * 60 * 60 * 1000) : new Date()) : null,
        selectedById: opts.isSelected ? (opts.selectedById ?? manager.id) : null,
        notes: opts.notes ?? null,
      },
    });

    // Create files with real URLs
    const fileCount = opts.fileCount ?? (opts.status === "SUBMITTED" ? 2 : 1);
    const files = pickFiles(fileCount);
    for (const f of files) {
      await prisma.submissionFile.create({
        data: {
          submissionId: submission.id,
          url: f.url,
          pathname: `submissions/${submission.id}/${f.pathname}`,
          contentType: f.contentType,
          size: f.size,
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
            createdAt: c.createdAt,
          },
        });
        commentCount++;
        if (c.replies) {
          for (const r of c.replies) {
            await prisma.submissionComment.create({
              data: {
                submissionId: submission.id,
                authorId: r.authorId,
                authorRole: r.authorRole,
                body: r.body,
                parentId: comment.id,
                createdAt: r.createdAt,
              },
            });
            commentCount++;
          }
        }
      }
    }

    submissionCount++;
    return submission;
  }

  // ── 7. Past year submissions (2023-2024) ──────────────────────────────────
  // All closed. ~60% of students submitted. Mix of selected/not. Some with comments, some without.

  console.log("\nSeeding 2023-2024 submissions...");
  const y2324 = yearIds["2023-2024"];
  const submissionWindow2324 = { start: new Date("2024-01-15"), end: new Date("2024-03-14") };

  for (const facultyName of FACULTY_NAMES) {
    const students = studentsByFaculty[facultyName];
    const coord = coordinators[facultyName];
    const titles = [...TITLES[facultyName]];
    const submittingStudents = students.slice(0, Math.floor(students.length * 0.6)); // 60% submit

    for (let i = 0; i < submittingStudents.length; i++) {
      const student = submittingStudents[i];
      const title = titles[i % titles.length];
      const submittedAt = randomDate(submissionWindow2324.start, submissionWindow2324.end);
      const isSelected = Math.random() < 0.5; // 50% selected

      // 70% have coordinator comments
      const hasComment = Math.random() < 0.7;
      const comments = hasComment
        ? [
            {
              authorId: coord.id,
              authorRole: "MARKETING_COORDINATOR",
              body: COORD_COMMENTS[i % COORD_COMMENTS.length],
              createdAt: new Date(submittedAt.getTime() + faker.number.int({ min: 1, max: 10 }) * 24 * 60 * 60 * 1000),
              replies: Math.random() < 0.4
                ? [
                    {
                      authorId: student.id,
                      authorRole: "STUDENT",
                      body: STUDENT_REPLIES[i % STUDENT_REPLIES.length],
                      createdAt: new Date(submittedAt.getTime() + faker.number.int({ min: 11, max: 20 }) * 24 * 60 * 60 * 1000),
                    },
                  ]
                : undefined,
            },
          ]
        : undefined;

      await createSubmission({
        userId: student.id,
        facultyId: student.facultyId,
        academicYearId: y2324,
        title: `${title}`,
        status: "SUBMITTED",
        submittedAt,
        isSelected,
        selectedById: manager.id,
        notes: isSelected ? faker.lorem.sentence() : undefined,
        fileCount: faker.number.int({ min: 1, max: 3 }),
        comments,
      });
    }
  }
  console.log(`  ✓ 2023-2024: ${submissionCount} submissions so far`);

  // ── 8. Past year submissions (2024-2025) ──────────────────────────────────
  // All closed. ~70% submit. More comments, more selections.

  console.log("Seeding 2024-2025 submissions...");
  const prevCount = submissionCount;
  const y2425 = yearIds["2024-2025"];
  const submissionWindow2425 = { start: new Date("2025-01-10"), end: new Date("2025-03-14") };

  for (const facultyName of FACULTY_NAMES) {
    const students = studentsByFaculty[facultyName];
    const coord = coordinators[facultyName];
    const titles = [...TITLES[facultyName]];
    const submittingStudents = students.slice(0, Math.floor(students.length * 0.7)); // 70% submit

    for (let i = 0; i < submittingStudents.length; i++) {
      const student = submittingStudents[i];
      const title = titles[(i + 5) % titles.length]; // Offset titles for variety
      const submittedAt = randomDate(submissionWindow2425.start, submissionWindow2425.end);
      const isSelected = Math.random() < 0.55; // 55% selected

      const hasComment = Math.random() < 0.75;
      const comments = hasComment
        ? [
            {
              authorId: coord.id,
              authorRole: "MARKETING_COORDINATOR",
              body: COORD_COMMENTS[(i + 3) % COORD_COMMENTS.length],
              createdAt: new Date(submittedAt.getTime() + faker.number.int({ min: 1, max: 8 }) * 24 * 60 * 60 * 1000),
              replies: Math.random() < 0.5
                ? [
                    {
                      authorId: student.id,
                      authorRole: "STUDENT",
                      body: STUDENT_REPLIES[(i + 2) % STUDENT_REPLIES.length],
                      createdAt: new Date(submittedAt.getTime() + faker.number.int({ min: 9, max: 18 }) * 24 * 60 * 60 * 1000),
                    },
                  ]
                : undefined,
            },
          ]
        : undefined;

      await createSubmission({
        userId: student.id,
        facultyId: student.facultyId,
        academicYearId: y2425,
        title: `${title}`,
        status: "SUBMITTED",
        submittedAt,
        isSelected,
        selectedById: manager.id,
        notes: isSelected ? faker.lorem.sentence() : undefined,
        fileCount: faker.number.int({ min: 1, max: 3 }),
        comments,
      });
    }
  }
  console.log(`  ✓ 2024-2025: ${submissionCount - prevCount} new submissions`);

  // ── 9. Current year (2025-2026) ───────────────────────────────────────────
  // Active year. Mix of DRAFT and SUBMITTED. Some selected, some awaiting review.
  // Some with no comments (exceptions), some with active threads.

  console.log("Seeding 2025-2026 submissions (active year)...");
  const prevCount2 = submissionCount;
  const y2526 = yearIds["2025-2026"];
  const submissionWindow2526 = { start: new Date("2025-10-01"), end: new Date("2026-02-28") };

  for (const facultyName of FACULTY_NAMES) {
    const students = studentsByFaculty[facultyName];
    const coord = coordinators[facultyName];
    const titles = [...TITLES[facultyName]];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];

      // First 15 students submit, last 5 have drafts only
      if (i < 15) {
        // SUBMITTED submission
        const title = titles[i % titles.length];
        const submittedAt = randomDate(submissionWindow2526.start, submissionWindow2526.end);

        // Selection: ~40% selected by coordinator
        const isSelected = i < 8; // First 8 students per faculty are selected
        const selectedById = manager.id;

        // Comments: ~60% have coordinator comments (leaves ~40% as exceptions)
        const hasComment = i < 10;
        const commentDate = new Date(submittedAt.getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
        const comments = hasComment
          ? [
              {
                authorId: coord.id,
                authorRole: "MARKETING_COORDINATOR",
                body: COORD_COMMENTS[(i + 7) % COORD_COMMENTS.length],
                createdAt: commentDate,
                replies: Math.random() < 0.6
                  ? [
                      {
                        authorId: student.id,
                        authorRole: "STUDENT",
                        body: STUDENT_REPLIES[(i + 4) % STUDENT_REPLIES.length],
                        createdAt: new Date(commentDate.getTime() + faker.number.int({ min: 1, max: 5 }) * 24 * 60 * 60 * 1000),
                      },
                    ]
                  : undefined,
              },
            ]
          : undefined;

        await createSubmission({
          userId: student.id,
          facultyId: student.facultyId,
          academicYearId: y2526,
          title,
          status: "SUBMITTED",
          submittedAt,
          isSelected,
          selectedById,
          notes: isSelected ? faker.lorem.sentence() : undefined,
          fileCount: faker.number.int({ min: 1, max: 3 }),
          comments,
        });

        // Some students also have a second submission (draft)
        if (i < 3) {
          await createSubmission({
            userId: student.id,
            facultyId: student.facultyId,
            academicYearId: y2526,
            title: titles[(i + 15) % titles.length],
            status: "DRAFT",
            fileCount: 1,
          });
        }
      } else {
        // DRAFT only (students who haven't submitted yet)
        const title = titles[(i + 10) % titles.length];
        await createSubmission({
          userId: student.id,
          facultyId: student.facultyId,
          academicYearId: y2526,
          title,
          status: "DRAFT",
          fileCount: faker.number.int({ min: 1, max: 2 }),
        });
      }
    }
  }
  console.log(`  ✓ 2025-2026: ${submissionCount - prevCount2} new submissions`);

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log("  SEED COMPLETE");
  console.log("═".repeat(60));
  console.log(`  Academic Years: 3 (2023-2024, 2024-2025, 2025-2026 active)`);
  console.log(`  Faculties:      ${FACULTY_NAMES.length}`);
  console.log(`  Students:       ${allStudents.length}`);
  console.log(`  Staff:          2 admins, 1 manager, 5 coordinators, 5 guests`);
  console.log(`  Total Users:    ${allStudents.length + 13}`);
  console.log(`  Submissions:    ${submissionCount}`);
  console.log(`  Comments:       ${commentCount}`);
  console.log("═".repeat(60));
  console.log("\n  Login credentials (all passwords: 'password'):");
  console.log("  ─────────────────────────────────────────────");
  console.log("  Admin:          sarah.johnson@uog.com");
  console.log("  Manager:        michael.chen@uog.com");
  console.log("  Coord (Eng):    tom.baker@uog.com");
  console.log("  Coord (Biz):    james.taylor@uog.com");
  console.log("  Coord (Arts):   lisa.nguyen@uog.com");
  console.log("  Coord (Sci):    jessica.williams@uog.com");
  console.log("  Coord (Med):    anna.patel@uog.com");
  console.log("  Guest (Eng):    guest.eng@uog.com");
  console.log("  Guest (Med):    priya.shah@uog.com");
  console.log("  Student (Eng):  david.park@uog.com");
  console.log("  Student (Sci):  alice.wong@uog.com");
  console.log("  Student (Arts): emily.rodriguez@uog.com");
  console.log("  Student (Biz):  diana.lee@uog.com");
  console.log("  Student (Med):  ethan.moore@uog.com");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
