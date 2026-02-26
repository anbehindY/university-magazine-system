"use client";

import {
  Calendar,
  ChartColumn,
  CircleCheckBig,
  FileText,
  Upload,
  Users,
} from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import getAvatarUrl from "@/lib/getAvatarUrl";

function buildPages(role?: string | null) {
  switch (role) {
    case "MARKETING_COORDINATOR":
      return [
        { title: "Submissions", url: "/coordinator/submissions", icon: FileText },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "MARKETING_MANAGER":
      return [
        { title: "Selected Submissions", url: "/manager/submissions", icon: CircleCheckBig },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "GUEST":
      return [
        { title: "Selected Articles", url: "/guest/submissions", icon: CircleCheckBig },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "STUDENT":
      return [
        { title: "My Submissions", url: "/submissions", icon: Upload },
      ];
    case "ADMINISTRATOR":
      return [
        { title: "Closure Dates", url: "/admin", icon: Calendar },
        { title: "Upload Rules", url: "/admin/upload-rules", icon: Upload },
        { title: "User Management", url: "/users", icon: Users },
      ];
    default:
      return [];
  }
}

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  facultyId?: string | null;
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser | null }) {
  const sessionUser = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    role: user?.role ?? null,
    facultyId: user?.facultyId ?? null,
    avatar: user?.image ?? getAvatarUrl(user?.email ?? user?.name ?? "user"),
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-3 py-3 transition-[gap,padding] duration-200 ease-linear group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-900 shadow-sm">
            <FileText className="size-5" />
          </span>
          <div className="min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-linear max-w-[12rem] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2">
            <div className="text-sm font-semibold leading-none text-white">
              University Magazine
            </div>
            <div className="mt-1 text-xs text-white/60">
              Contribution Portal
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={buildPages(sessionUser.role)} />
      </SidebarContent>
      <SidebarFooter className="mb-1 border-t border-white/10 pt-3">
        <NavUser user={sessionUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
