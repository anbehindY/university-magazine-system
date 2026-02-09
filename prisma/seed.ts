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
      data: { role: "ADMINISTRATOR" },
    });

    console.log(`Default admin ensured: ${adminEmail}`);
  } else {
    console.log(
      "Skipping default admin seed (DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set)."
    );
  }

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
