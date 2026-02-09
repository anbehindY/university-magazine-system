"use client";

import { BookOpen, Calendar, LayoutDashboard, UsersRound } from "lucide-react";
import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import getAvatarUrl from "@/lib/getAvatarUrl";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
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
  ],
};

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser | null }) {
  const navUser = {
    name: user?.name ?? "User",
    email: user?.email ?? "",
    avatar: user?.image ?? getAvatarUrl(user?.email ?? user?.name ?? "user"),
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* <div className="flex items-center gap-2.5 px-3 py-2 transition-[gap,padding] duration-200 ease-linear group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:justify-center">
          <University className="size-6 shrink-0" />
          <span className="text-sm font-semibold whitespace-nowrap overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-linear max-w-[12rem] group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2">
            Management Dashboard
          </span>
        </div> */}
        <NavUser user={navUser} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter className="mb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              variant={"outline"}
              className="w-full"
              onClick={() => signOut()}
            >
              Logout
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
