"use client";

import {
  BookOpen,
  Calendar,
  Home,
  LayoutDashboard,
  UsersRound,
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

const pages = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Users",
    url: "/users",
    icon: UsersRound,
  },
  {
    title: "Closure Schedule",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Reporting",
    url: "#",
    icon: BookOpen,
  },
];

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
};

const DASHBOARD_LABELS: Record<string, string> = {
  ADMINISTRATOR: "Admin Dashboard",
  MARKETING_COORDINATOR: "Marketing Dashboard",
  MARKETING_MANAGER: "Marketing Dashboard",
  STUDENT: "Student Dashboard",
};

function getDashboardLabel(role?: string | null) {
  return (role && DASHBOARD_LABELS[role]) || "Dashboard";
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser | null }) {
  const sessionUser = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    role: user?.role ?? null,
    avatar: user?.image ?? getAvatarUrl(user?.email ?? user?.name ?? "user"),
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-3 py-2 transition-[gap,padding] duration-200 ease-linear group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
          <LayoutDashboard className="size-6 shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-linear max-w-[12rem] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2">
            {getDashboardLabel(sessionUser.role)}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={pages} />
      </SidebarContent>
      <SidebarFooter className="mb-1">
        <NavUser user={sessionUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
