"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@/lib/auth-client";
import {
  ArrowUpRight,
  CalendarClock,
  FileText,
  FolderArchive,
  University,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending)
    return <p className="text-center mt-8 text-slate-600">Loading...</p>;
  if (!session?.user)
    return <p className="text-center mt-8 text-slate-600">Redirecting...</p>;

  const { user } = session;

  return (
    <main className="space-y-8 text-slate-900">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              <University className="h-3.5 w-3.5" />
              University Magazine System
            </div>
            <h1 className="text-3xl font-semibold sm:text-4xl">
              Welcome back, {user.name || "Editor"}.
            </h1>
            <p className="text-slate-600">
              Keep your publication on schedule with a quick view of the team,
              tasks, and reporting at a glance.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => router.push("/users")}
            >
              Manage Users
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => router.push("/users")}>
              Create User
              <UserPlus className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Active Contributors",
            value: "128",
            icon: UsersRound,
            hint: "Across all faculties",
          },
          {
            title: "Drafts Awaiting Review",
            value: "24",
            icon: FileText,
            hint: "Need editorial pass",
          },
          {
            title: "Upcoming Closures",
            value: "3",
            icon: CalendarClock,
            hint: "Next 14 days",
          },
          {
            title: "Reports Due",
            value: "2",
            icon: FolderArchive,
            hint: "This month",
          },
        ].map((stat) => (
          <Card
            key={stat.title}
            className="border-slate-200 bg-white text-slate-900"
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {stat.hint}
                </CardDescription>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                <stat.icon className="h-5 w-5 text-slate-700" />
              </span>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">
              {stat.value}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription className="text-slate-500">
              Latest updates from your publication workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                title: "Science faculty submitted 6 new articles",
                time: "12 minutes ago",
              },
              {
                title: "Marketing coordinator closed April submissions",
                time: "2 hours ago",
              },
              {
                title: "New guest reviewer assigned to arts review",
                time: "Yesterday",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.time}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Your Access</CardTitle>
            <CardDescription className="text-slate-500">
              Profile details and permissions summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Role</span>
              <span className="font-medium">
                {user.role?.replaceAll("_", " ") || "User"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Email</span>
              <span className="truncate font-medium">{user.email}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Stay on top of closures and contributor activity. Your dashboard
              will surface urgent tasks automatically.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
