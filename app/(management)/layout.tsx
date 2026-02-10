import { AppSidebar } from "@/components/app-sidebar";
import ManagementHeader from "@/components/management-header";
import { getCurrentUser } from "@/lib/auth-helpers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <ManagementHeader />
        <section className="px-6">{children}</section>
      </SidebarInset>
    </SidebarProvider>
  );
}
