import prisma from "@/lib/prisma";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

export const auth = betterAuth({
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
