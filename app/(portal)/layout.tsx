import { AppSidebar } from "@/components/app-sidebar";
import ManagementHeader from "@/components/management-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import React from "react";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={null} />
      <SidebarInset>
        <ManagementHeader />
        <section className="px-6 pt-6 pb-8 sm:px-8 lg:px-10">{children}</section>
      </SidebarInset>
    </SidebarProvider>
  );
}
