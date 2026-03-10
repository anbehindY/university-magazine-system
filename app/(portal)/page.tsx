"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardData = {
  submissions?: { id: string; title: string | null; status: string; isSelected: boolean; submittedAt: string | null }[];
  coordinatorSubmissions?: { id: string; title: string | null; isSelected: boolean; studentName: string; submittedAt: string | null }[];
  managerSubmissions?: { id: string; title: string | null; studentName: string; facultyName: string }[];
  guestSubmissions?: { id: string; title: string | null; studentName: string }[];
  exceptions?: { id: string; title: string | null; daysSinceSubmission: number | null }[];
  reportStats?: { facultyName: string | null; submissionCount: number; distinctContributors: number }[];
  academicYear?: { yearLabel: string; firstClosureDate: string | null; finalClosureDate: string | null } | null;
  userStats?: { total: number; active: number; byRole: Record<string, number> };
  academicYears?: { id: string; yearLabel: string; isActive: boolean }[];
};

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  color = "slate",
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: typeof FileText;
  color?: "slate" | "amber" | "red" | "emerald";
}) {
  const colorMap = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <Card className="border-slate-200 bg-white text-slate-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
          <CardDescription className="text-xs text-slate-500">{hint}</CardDescription>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="text-3xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </CardHeader>
      <CardContent><Skeleton className="h-8 w-16" /></CardContent>
    </Card>
  );
}

// ─── Role-specific dashboard components ─────────────────────────────

function CoordinatorDashboard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const subs = data.coordinatorSubmissions ?? [];
  const total = subs.length;
  const selected = subs.filter((s) => s.isSelected).length;
  const exceptions = data.exceptions?.length ?? 0;
  const daysLeft = daysUntil(data.academicYear?.finalClosureDate);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Faculty Submissions" value={total} hint="Submitted articles" icon={FileText} />
        <StatCard title="Selected" value={selected} hint="Chosen for publication" icon={CheckCircle2} color="emerald" />
        <StatCard
          title="Need Comment"
          value={exceptions}
          hint="No coordinator feedback yet"
          icon={AlertTriangle}
          color={exceptions > 0 ? "red" : "slate"}
        />
        <StatCard
          title="Final Closure"
          value={daysLeft !== null ? `${daysLeft} days` : "No date set"}
          hint="Until editing closes"
          icon={CalendarClock}
          color={daysLeft !== null && daysLeft <= 7 ? "amber" : "slate"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription className="text-slate-500">Latest articles from your faculty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subs.length === 0 && <p className="text-sm text-slate-500">No submissions yet.</p>}
            {subs.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{s.title ?? "Untitled"}</p>
                  <p className="text-xs text-slate-500">by {s.studentName}</p>
                </div>
                {s.isSelected ? (
                  <span className="text-xs font-medium text-emerald-600">Selected</span>
                ) : (
                  <span className="text-xs text-slate-400">Pending</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-slate-500">Jump to your key tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/coordinator/submissions")}>
              Review Submissions <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/reports")}>
              View Reports <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function ManagerDashboard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const selected = data.managerSubmissions ?? [];
  const stats = data.reportStats ?? [];
  const totalSubmissions = stats.reduce((sum, f) => sum + f.submissionCount, 0);
  const activeFaculties = stats.filter((f) => f.submissionCount > 0).length;
  const overdueExceptions = data.exceptions?.length ?? 0;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Submissions" value={totalSubmissions} hint="Across all faculties" icon={FileText} />
        <StatCard title="Selected Articles" value={selected.length} hint="Chosen for publication" icon={CheckCircle2} color="emerald" />
        <StatCard
          title="Overdue"
          value={overdueExceptions}
          hint="14+ days without feedback"
          icon={AlertTriangle}
          color={overdueExceptions > 0 ? "red" : "slate"}
        />
        <StatCard title="Active Faculties" value={activeFaculties} hint="With submissions" icon={BookOpen} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Faculty Breakdown</CardTitle>
            <CardDescription className="text-slate-500">Submissions per faculty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
            {stats.map((f) => (
              <div key={f.facultyName} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{f.facultyName ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500">{f.distinctContributors} contributor{f.distinctContributors !== 1 ? "s" : ""}</p>
                </div>
                <span className="text-sm font-semibold">{f.submissionCount}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-slate-500">Jump to your key tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/manager/submissions")}>
              View Selected Articles <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/reports")}>
              View Reports <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function StudentDashboard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const subs = data.submissions ?? [];
  const drafts = subs.filter((s) => s.status === "DRAFT").length;
  const submitted = subs.filter((s) => s.status === "SUBMITTED").length;
  const selectedCount = subs.filter((s) => s.isSelected).length;
  const daysLeft = daysUntil(data.academicYear?.firstClosureDate);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Drafts" value={drafts} hint="Work in progress" icon={FileText} />
        <StatCard title="Submitted" value={submitted} hint="Sent for review" icon={Clock} color="amber" />
        <StatCard title="Selected" value={selectedCount} hint="Chosen for magazine" icon={CheckCircle2} color="emerald" />
        <StatCard
          title="Submission Deadline"
          value={daysLeft !== null ? `${daysLeft} days` : "No date set"}
          hint="Until submissions close"
          icon={CalendarClock}
          color={daysLeft !== null && daysLeft <= 7 ? "amber" : "slate"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>My Submissions</CardTitle>
            <CardDescription className="text-slate-500">Your recent work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subs.length === 0 && <p className="text-sm text-slate-500">You haven&apos;t submitted anything yet.</p>}
            {subs.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium">{s.title ?? "Untitled"}</p>
                <span className={`text-xs font-medium ${s.status === "SUBMITTED" ? "text-amber-600" : "text-slate-400"}`}>
                  {s.status === "SUBMITTED" ? "Submitted" : "Draft"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-slate-500">Jump to your key tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/student/submissions")}>
              View My Submissions <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function GuestDashboard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const articles = data.guestSubmissions ?? [];
  const yearLabel = data.academicYear?.yearLabel ?? "—";

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Articles Available" value={articles.length} hint="Selected for your faculty" icon={BookOpen} color="emerald" />
        <StatCard title="Academic Year" value={yearLabel} hint="Current active year" icon={CalendarClock} />
        <StatCard title="Read-Only Access" value="Guest" hint="Browse and review articles" icon={ShieldCheck} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Selected Articles</CardTitle>
            <CardDescription className="text-slate-500">Articles chosen for your faculty</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {articles.length === 0 && <p className="text-sm text-slate-500">No selected articles yet.</p>}
            {articles.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{s.title ?? "Untitled"}</p>
                  <p className="text-xs text-slate-500">by {s.studentName}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-slate-500">Jump to your key tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/guest/submissions")}>
              Browse Articles <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/reports")}>
              View Reports <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function AdminDashboard({ data, router }: { data: DashboardData; router: ReturnType<typeof useRouter> }) {
  const userStats = data.userStats;
  const years = data.academicYears ?? [];
  const activeYear = years.find((y) => y.isActive);
  const totalSubmissions = (data.reportStats ?? []).reduce((sum, f) => sum + f.submissionCount, 0);

  const roleLabels: Record<string, string> = {
    ADMINISTRATOR: "Administrators",
    MARKETING_MANAGER: "Managers",
    MARKETING_COORDINATOR: "Coordinators",
    STUDENT: "Students",
    GUEST: "Guests",
  };

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={userStats?.total ?? "—"} hint="Registered accounts" icon={Users} />
        <StatCard title="Active Users" value={userStats?.active ?? "—"} hint="Not banned" icon={CheckCircle2} color="emerald" />
        <StatCard title="Academic Years" value={years.length} hint={activeYear ? `Current: ${activeYear.yearLabel}` : "No active year"} icon={CalendarClock} />
        <StatCard title="Total Submissions" value={totalSubmissions} hint="Across all faculties" icon={FileText} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription className="text-slate-500">Distribution of accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {userStats
              ? Object.entries(userStats.byRole).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium">{roleLabels[role] ?? role}</p>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))
              : <p className="text-sm text-slate-500">Loading...</p>
            }
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white text-slate-900">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-slate-500">System administration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/admin/users")}>
              Manage Users <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/admin/closure-dates")}>
              Closure Dates <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/admin/upload-rules")}>
              Upload Rules <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => router.push("/reports")}>
              View Reports <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

// ─── Role labels ────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  MARKETING_COORDINATOR: "Coordinator",
  MARKETING_MANAGER: "Manager",
  ADMINISTRATOR: "Administrator",
  STUDENT: "Student",
  GUEST: "Guest",
};

const ROLE_DESCRIPTIONS: Record<string, { headline: string; subhead: string }> = {
  MARKETING_COORDINATOR: {
    headline: "Review and manage your faculty's submissions.",
    subhead: "Select articles, leave feedback, and track deadlines.",
  },
  MARKETING_MANAGER: {
    headline: "Oversee submissions across all faculties.",
    subhead: "View selected articles, download publications, and monitor progress.",
  },
  STUDENT: {
    headline: "Submit your articles for the university magazine.",
    subhead: "Create drafts, upload files, and track your submission status.",
  },
  GUEST: {
    headline: "Browse selected articles from your faculty.",
    subhead: "Read approved submissions and view faculty reports.",
  },
  ADMINISTRATOR: {
    headline: "Manage the university magazine system.",
    subhead: "Configure academic years, users, and submission rules.",
  },
};

// ─── Main page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);

  const role = session?.user?.role ?? "STUDENT";

  useEffect(() => {
    if (!session?.user) return;

    const r = session.user.role ?? "STUDENT";

    if (r === "GUEST") {
      setLoading(false);
      return; // Guest redirects to /guest, no need to fetch dashboard data
    }

    const fetches: Promise<void>[] = [];

    // Academic year (public)
    fetches.push(
      fetch("/api/academic-years")
        .then((res) => res.json())
        .then((d) => setData((prev) => ({ ...prev, academicYear: d.academicYear })))
        .catch(() => {})
    );

    if (r === "MARKETING_COORDINATOR") {
      fetches.push(
        fetch("/api/coordinator/submissions")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, coordinatorSubmissions: d.submissions })))
          .catch(() => {})
      );
      fetches.push(
        fetch("/api/reports?type=exceptions")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, exceptions: d.data })))
          .catch(() => {})
      );
    }

    if (r === "MARKETING_MANAGER") {
      fetches.push(
        fetch("/api/manager/submissions")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, managerSubmissions: d.submissions })))
          .catch(() => {})
      );
      fetches.push(
        fetch("/api/reports?type=submissions")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, reportStats: d.data })))
          .catch(() => {})
      );
      fetches.push(
        fetch("/api/reports?type=exceptions&overdue=true")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, exceptions: d.data })))
          .catch(() => {})
      );
    }

    if (r === "STUDENT") {
      fetches.push(
        fetch("/api/submissions")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, submissions: d.submissions })))
          .catch(() => {})
      );
    }

    if (r === "ADMINISTRATOR") {
      fetches.push(
        fetch("/api/admin/users/stats")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, userStats: d })))
          .catch(() => {})
      );
      fetches.push(
        fetch("/api/admin/academic-years")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, academicYears: d.academicYears })))
          .catch(() => {})
      );
      fetches.push(
        fetch("/api/reports?type=submissions")
          .then((res) => res.json())
          .then((d) => setData((prev) => ({ ...prev, reportStats: d.data })))
          .catch(() => {})
      );
    }

    Promise.allSettled(fetches).finally(() => setLoading(false));
  }, [session?.user]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/sign-in");
    }
  }, [isPending, session, router]);

  if (isPending) return <LoadingScreen />;
  if (!session?.user) return <LoadingScreen />;

  const { user } = session;
  const lastLoginAt = user?.lastLoginAt as string | null;
  const desc = ROLE_DESCRIPTIONS[role] ?? ROLE_DESCRIPTIONS.STUDENT;

  return (
    <main className="space-y-6 text-slate-900">
      {/* Welcome header */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {ROLE_LABELS[role] ?? role} Dashboard
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {lastLoginAt
              ? `Welcome back, ${user.name || "User"}`
              : `Welcome, ${user.name || "User"}`}
          </h1>
          <p className="text-slate-500">{desc.headline}</p>
          <p className="text-sm text-slate-400">{desc.subhead}</p>
          {lastLoginAt && (
            <p className="text-xs text-slate-400 pt-1">
              Last login: {format(new Date(lastLoginAt), "d MMMM yyyy, h:mm a")}
            </p>
          )}
        </div>
      </section>

      {/* Role-specific content */}
      {loading ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </section>
      ) : (
        <>
          {role === "MARKETING_COORDINATOR" && <CoordinatorDashboard data={data} router={router} />}
          {role === "MARKETING_MANAGER" && <ManagerDashboard data={data} router={router} />}
          {role === "STUDENT" && <StudentDashboard data={data} router={router} />}
          {role === "GUEST" && <GuestDashboard data={data} router={router} />}
          {role === "ADMINISTRATOR" && <AdminDashboard data={data} router={router} />}
        </>
      )}
    </main>
  );
}
