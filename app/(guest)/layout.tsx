import { getCurrentUser } from "@/lib/auth-helpers";
import { GuestHeader } from "./guest/_components/guest-header";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if ((user as any)?.mustChangePassword) {
    redirect("/change-password");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <GuestHeader user={user} />
      {children}
    </div>
  );
}
