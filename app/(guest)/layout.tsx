import { getCurrentUser } from "@/lib/auth-helpers";
import { GuestHeader } from "./guest/_components/guest-header";
import React from "react";

export const dynamic = "force-dynamic";

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <GuestHeader user={user} />
      {children}
    </div>
  );
}
