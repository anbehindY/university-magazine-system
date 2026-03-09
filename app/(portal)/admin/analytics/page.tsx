"use client";

import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { Activity, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type AnalyticsData = {
  activeUsers: {
    total7d: number;
    total30d: number;
    daily: { date: string; count: number }[];
  };
  browsers: {
    name: string;
    count: number;
    percentage: number;
  }[];
};

const COLORS = [
  "#0f172a",
  "#fbbf24",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#6b7280",
];

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d">("30d");

  const allowedRoles = ["ADMINISTRATOR", "MARKETING_MANAGER"];

  useEffect(() => {
    if (
      !isPending &&
      (!session?.user || !allowedRoles.includes(session.user.role ?? ""))
    ) {
      router.push("/dashboard");
    }
  }, [isPending, session, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to load analytics.");
        setData(null);
        return;
      }

      setData(json);
    } catch {
      setError("Failed to load analytics.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (
      isPending ||
      !session?.user ||
      !allowedRoles.includes(session.user.role ?? "")
    ) {
      return;
    }
    fetchData();
  }, [isPending, session?.user, session?.user?.role, fetchData]);

  if (isPending) {
    return <LoadingScreen />;
  }

  if (
    !session?.user ||
    !allowedRoles.includes(session.user.role ?? "")
  ) {
    return <LoadingScreen />;
  }

  const presets = [
    { label: "Last 7 days", value: "7d" as const },
    { label: "Last 30 days", value: "30d" as const },
  ];

  const isEmpty =
    data &&
    data.activeUsers.total7d === 0 &&
    data.activeUsers.total30d === 0;

  return (
    <main className="space-y-6 text-slate-900">
      {/* Page header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Usage Stats
        </h1>
        <p className="text-base text-slate-500">
          Platform usage analytics
        </p>
      </div>

      <div className="border-t border-slate-200" />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="space-y-6">
          {/* Skeleton stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-4 w-32 rounded mb-3" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <Skeleton className="h-4 w-32 rounded mb-3" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          </div>
          {/* Skeleton chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <Skeleton className="h-4 w-40 rounded mb-4" />
            <Skeleton className="h-[300px] w-full rounded" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <Skeleton className="h-4 w-40 rounded mb-4" />
            <Skeleton className="h-[350px] w-full rounded" />
          </div>
        </div>
      )}

      {!loading && !error && isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <BarChart3 className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">No usage data available</p>
        </div>
      )}

      {!loading && !error && data && !isEmpty && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
                <Activity className="h-4 w-4" />
                Active Users (7 days)
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {data.activeUsers.total7d}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-1">
                <Activity className="h-4 w-4" />
                Active Users (30 days)
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {data.activeUsers.total30d}
              </div>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex items-center gap-3">
            {presets.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p.value)}
                className={
                  period === p.value
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Active Users Trend - AreaChart */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Daily Active Users
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.activeUsers.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0f172a"
                  fill="#0f172a"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Browser Breakdown - PieChart donut */}
          {data.browsers.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Browser Usage
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data.browsers}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    stroke="none"
                  >
                    {data.browsers.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
