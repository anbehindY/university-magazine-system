import prisma from "@/lib/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const userId = session.userId as string | undefined;
          if (!userId) return;
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { banned: true },
          });
          if (user?.banned) {
            return false;
          }
        },
        after: async (session) => {
          const userId = session.userId as string | undefined;
          if (!userId) return;
          prisma.user
            .findUnique({
              where: { id: userId },
              select: { id: true, name: true, email: true },
            })
            .then((user) => {
              if (!user) return;
              return Promise.all([
                prisma.user.update({
                  where: { id: userId },
                  data: { lastLoginAt: new Date() },
                }),
                prisma.$executeRaw`
                  INSERT INTO "access_activity" ("id", "user_id", "user_name", "user_email", "activity_type", "created_at")
                  VALUES (${crypto.randomUUID()}, ${user.id}, ${user.name}, ${user.email}, ${"LOGIN"}, ${new Date()})
                `,
              ]);
            })
            .catch(console.error);
        },
      },
    },
  },
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
