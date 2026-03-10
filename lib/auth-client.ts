import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "@/lib/auth";

export const { getSession, signIn, signOut, useSession } = createAuthClient({
  plugins: [
    adminClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
