"use client";

import {
  Calendar,
  ChartColumn,
  CircleCheckBig,
  FileText,
  LayoutDashboard,
  Upload,
  Users,
} from "lucide-react";
import * as React from "react";

function MagazineLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="4"
        y="3"
        width="18"
        height="26"
        rx="2"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <rect
        x="10"
        y="3"
        width="18"
        height="26"
        rx="2"
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth="1"
      />
      <path
        d="M14 10h10M14 14h10M14 18h7"
        stroke="#0f172a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="9"
        cy="8"
        r="2"
        fill="#fbbf24"
        stroke="#0f172a"
        strokeWidth="0.75"
      />
    </svg>
  );
}

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
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        {
          title: "Submissions",
          url: "/coordinator/submissions",
          icon: FileText,
        },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "MARKETING_MANAGER":
      return [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        {
          title: "Selected Submissions",
          url: "/manager/submissions",
          icon: CircleCheckBig,
        },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "GUEST":
      return [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        {
          title: "Selected Articles",
          url: "/guest/submissions",
          icon: CircleCheckBig,
        },
        { title: "Reports", url: "/reports", icon: ChartColumn },
      ];
    case "STUDENT":
      return [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
        { title: "My Submissions", url: "/submissions", icon: Upload },
      ];
    case "ADMINISTRATOR":
      return [
        { title: "Dashboard", url: "/", icon: LayoutDashboard },
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
        <a
          href="/"
          className="flex items-center gap-3 px-3 py-4 transition-[gap,padding] duration-200 ease-linear group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center"
        >
          <span className="flex size-9 shrink-0 items-center justify-center">
            <MagazineLogo className="size-9" />
          </span>
          <div className="min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-linear max-w-[12rem] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2">
            <div className="text-[13px] font-bold tracking-tight leading-none text-white">
              University Magazine
            </div>
            <div className="mt-1 text-[11px] font-medium tracking-wide uppercase text-white/40">
              Contribution System
            </div>
          </div>
        </a>
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
