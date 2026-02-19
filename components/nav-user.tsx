"use client";

import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";

function getInitials(name?: string | null) {
  if (!name) return "SJ";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    role?: string | null;
  };
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          id="user-menu-trigger"
          className="hover:bg-white/10 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none focus:outline-none"
        >
          <div>
            <Avatar className="h-9 w-9 rounded-full">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-full bg-amber-400 text-slate-900">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium text-white">
                {user.name}
              </span>
              <span className="truncate text-xs text-white/60">
                {user.role ?? "Administrator"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
