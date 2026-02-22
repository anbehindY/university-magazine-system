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
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  ArrowUpRight,
  CalendarClock,
  CircleCheckBig,
  ClipboardList,
  FileText,
  FolderArchive,
  Megaphone,
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
    return <LoadingScreen />;
  if (!session?.user)
    return <LoadingScreen />;

  const { user } = session;

  const role = user.role ?? "STUDENT";
  const isAdmin = role === "ADMINISTRATOR";

  if (!isAdmin) {
    const roleLabel = role.replaceAll("_", " ");
    const roleCopy: Record<string, { headline: string; subhead: string }> = {
      MARKETING_MANAGER: {
        headline: "Oversight dashboard for marketing leadership.",
        subhead: "Track university-wide submissions and upcoming deadlines.",
      },
      MARKETING_COORDINATOR: {
        headline: "Faculty pipeline at a glance.",
        subhead: "Keep your contributors moving toward closure.",
      },
      STUDENT: {
        headline: "Your contributor workspace.",
        subhead: "Manage drafts, feedback, and upcoming deadlines.",
      },
      GUEST: {
        headline: "Read-only review center.",
        subhead: "Access curated reports and feedback summaries.",
      },
    };

    const content = roleCopy[role] ?? roleCopy.STUDENT;

    const roleStats: Record<
      string,
      { title: string; value: string; hint: string; icon: typeof FileText }[]
    > = {
      MARKETING_MANAGER: [
        { title: "Open Campaigns", value: "6", hint: "Across faculties", icon: Megaphone },
        { title: "Faculty Coverage", value: "92%", hint: "Active this month", icon: UsersRound },
        { title: "Pending Reviews", value: "18", hint: "Needs escalation", icon: FileText },
        { title: "Next Closure", value: "7 days", hint: "University-wide", icon: CalendarClock },
      ],
      MARKETING_COORDINATOR: [
        { title: "Faculty Drafts", value: "12", hint: "Awaiting review", icon: FileText },
        { title: "Contributor Follow-ups", value: "5", hint: "In progress", icon: UsersRound },
        { title: "Feedback Requests", value: "9", hint: "Due this week", icon: ClipboardList },
        { title: "Closure Countdown", value: "5 days", hint: "Faculty deadline", icon: CalendarClock },
      ],
      STUDENT: [
        { title: "Active Drafts", value: "2", hint: "In progress", icon: FileText },
        { title: "Feedback Received", value: "3", hint: "Last 14 days", icon: ClipboardList },
        { title: "Submission Window", value: "12 days", hint: "Remaining", icon: CalendarClock },
        { title: "Published Pieces", value: "1", hint: "This term", icon: CircleCheckBig },
      ],
      GUEST: [
        { title: "Reports Available", value: "4", hint: "Latest faculty", icon: FolderArchive },
        { title: "Items to Review", value: "6", hint: "Read-only", icon: FileText },
        { title: "Feedback Notes", value: "10", hint: "Recent", icon: ClipboardList },
        { title: "Last Sync", value: "2 hours", hint: "Data refresh", icon: CalendarClock },
      ],
    };

    const stats = roleStats[role] ?? roleStats.STUDENT;

    const activityItems: Record<string, { title: string; time: string }[]> = {
      MARKETING_MANAGER: [
        { title: "University-wide submissions summary updated", time: "10 minutes ago" },
        { title: "Faculty of Science hit 80% coverage", time: "1 hour ago" },
        { title: "New marketing brief shared with coordinators", time: "Yesterday" },
      ],
      MARKETING_COORDINATOR: [
        { title: "Engineering drafts moved to review", time: "22 minutes ago" },
        { title: "Contributor follow-up reminders sent", time: "2 hours ago" },
        { title: "New feedback from marketing manager", time: "Yesterday" },
      ],
      STUDENT: [
        { title: "Editor left feedback on Draft 2", time: "30 minutes ago" },
        { title: "New guidelines posted for submissions", time: "3 hours ago" },
        { title: "Closure date moved by 2 days", time: "Yesterday" },
      ],
      GUEST: [
        { title: "Faculty report pack refreshed", time: "45 minutes ago" },
        { title: "New reviewer notes added", time: "4 hours ago" },
        { title: "Monthly summary published", time: "Yesterday" },
      ],
    };

    return (
      <main className="space-y-8 text-slate-900">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                <University className="h-3.5 w-3.5" />
                {roleLabel}
              </div>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Welcome back, {user.name || "Contributor"}.
              </h1>
              <p className="text-slate-600">{content.headline}</p>
              <p className="text-sm text-slate-500">{content.subhead}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => router.push("/")}
              >
                View Dashboard
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
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
              <CardTitle>Recent Highlights</CardTitle>
              <CardDescription className="text-slate-500">
                Role-specific updates and activity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(activityItems[role] ?? activityItems.STUDENT).map((item) => (
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
                Role permissions and quick tips.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">Role</span>
                <span className="font-medium">{roleLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-slate-500">Email</span>
                <span className="truncate font-medium">{user.email}</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                You can see what matters most to your role. Reach out to your
                administrator if you need expanded access.
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

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
