import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const { getSession, signIn, signOut, useSession } = createAuthClient({
  plugins: [adminClient()],
});
