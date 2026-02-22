import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { PrismaClient } from "./generated/client";

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

async function main() {
  console.log("Seeding database...");

  // Create faculties
  const faculties = [
    "Faculty of Engineering",
    "Faculty of Business",
    "Faculty of Arts and Humanities",
    "Faculty of Science",
    "Faculty of Medicine",
  ];

  for (const facultyName of faculties) {
    await prisma.faculty.upsert({
      where: { name: facultyName },
      update: {},
      create: { name: facultyName },
    });
    console.log(`Created/Updated faculty: ${facultyName}`);
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminName = process.env.DEFAULT_ADMIN_NAME || "Default Admin";

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const result = await auth.api.signUpEmail({
        body: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        },
      });

      if (!result?.user) {
        throw new Error("Failed to create default admin user");
      }
    }

    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: "ADMINISTRATOR", emailVerified: true },
    });

    console.log(`Default admin ensured: ${adminEmail}`);
  } else {
    console.log(
      "Skipping default admin seed (DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set)."
    );
  }

  const facultyRecords = await prisma.faculty.findMany({
    select: { id: true, name: true },
  });

  const facultyByName = new Map(
    facultyRecords.map((faculty) => [faculty.name, faculty.id])
  );

  const seedUsers = [
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@uog.com",
      role: "ADMINISTRATOR",
      facultyName: "Faculty of Business",
    },
    {
      name: "Michael Chen",
      email: "michael.chen@uog.com",
      role: "MARKETING_MANAGER",
      facultyName: null,
    },
    {
      name: "Emily Rodriguez",
      email: "emily.rodriguez@uog.com",
      role: "STUDENT",
      facultyName: "Faculty of Arts and Humanities",
    },
    {
      name: "David Park",
      email: "david.park@uog.com",
      role: "STUDENT",
      facultyName: "Faculty of Engineering",
    },
    {
      name: "Jessica Williams",
      email: "jessica.williams@uog.com",
      role: "MARKETING_COORDINATOR",
      facultyName: "Faculty of Science",
    },
    {
      name: "Priya Shah",
      email: "priya.shah@uog.com",
      role: "GUEST",
      facultyName: "Faculty of Medicine",
    },
  ] as const;

  const defaultPassword = "password";

  for (const user of seedUsers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (!existingUser) {
      const result = await auth.api.signUpEmail({
        body: {
          name: user.name,
          email: user.email,
          password: defaultPassword,
        },
      });

      if (!result?.user) {
        throw new Error(`Failed to create seed user ${user.email}`);
      }
    }

    await prisma.user.update({
      where: { email: user.email },
      data: {
        role: user.role,
        emailVerified: true,
        facultyId: user.facultyName
          ? facultyByName.get(user.facultyName) ?? null
          : null,
      },
    });
  }

  console.log("Seed users ensured for all roles.");

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
