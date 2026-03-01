"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function ManagementHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-slate-200 bg-white px-4 md:hidden">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-3 h-5" />
      <span className="text-sm font-medium text-slate-600">Menu</span>
    </header>
  );
}
