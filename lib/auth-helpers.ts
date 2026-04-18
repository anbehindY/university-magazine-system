import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user || null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser();
  
  if (!user) {
    return { authorized: false, user: null, error: "Not authenticated" };
  }

  if (user.mustChangePassword && user.role !== "GUEST") {
    return { authorized: false, user, error: "Password change required" };
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    return { authorized: false, user, error: "Insufficient permissions" };
  }

  return { authorized: true, user, error: null };
}

export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "ADMINISTRATOR";
}

export async function isCoordinator() {
  const user = await getCurrentUser();
  return user?.role === "MARKETING_COORDINATOR";
}

export async function isManager() {
  const user = await getCurrentUser();
  return user?.role === "MARKETING_MANAGER";
}
