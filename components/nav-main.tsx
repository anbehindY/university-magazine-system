"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const pathname = usePathname();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            item.isActive ??
            (pendingUrl ? pendingUrl === item.url : pathname === item.url);

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className="hover:bg-white/10 data-[active=true]:bg-amber-400 data-[active=true]:text-slate-900 data-[active=true]:shadow-sm data-[active=true]:hover:bg-amber-300/90"
              >
                <Link
                  href={item.url}
                  onClick={() => {
                    if (pathname !== item.url) setPendingUrl(item.url);
                  }}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
