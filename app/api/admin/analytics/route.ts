import { requireRole } from "@/lib/auth-helpers";
import prisma from "@/lib/prisma";
import UAParser from "ua-parser-js";
import { isBot } from "ua-parser-js/helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await requireRole([
      "ADMINISTRATOR",
      "MARKETING_MANAGER",
    ]);
    if (!authorized) {
      return NextResponse.json(
        { error: error ?? "Unauthorized" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") === "7d" ? "7d" : "30d";

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

    // Fetch sessions for 30d (superset of 7d), excluding banned users
    const sessions = await prisma.session.findMany({
      where: {
        updatedAt: { gte: thirtyDaysAgo },
        user: { banned: { not: true } },
      },
      select: { userId: true, updatedAt: true },
    });

    // Compute totals
    const uniqueUsers7d = new Set(
      sessions
        .filter((s) => s.updatedAt >= sevenDaysAgo)
        .map((s) => s.userId)
    );
    const uniqueUsers30d = new Set(sessions.map((s) => s.userId));

    // Build daily cumulative array for the selected period
    const periodStart = period === "7d" ? sevenDaysAgo : thirtyDaysAgo;
    const periodDays = period === "7d" ? 7 : 30;

    // Filter sessions to the selected period
    const periodSessions = sessions.filter(
      (s) => s.updatedAt >= periodStart
    );

    // Group sessions by day (UTC YYYY-MM-DD)
    const sessionsByDay = new Map<string, Set<string>>();
    for (const s of periodSessions) {
      const day = s.updatedAt.toISOString().split("T")[0];
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, new Set());
      }
      sessionsByDay.get(day)!.add(s.userId);
    }

    // Build cumulative daily array
    const daily: { date: string; count: number }[] = [];
    const cumulativeUsers = new Set<string>();

    for (let i = 0; i < periodDays; i++) {
      const d = new Date(periodStart);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      const dayUsers = sessionsByDay.get(dateStr);
      if (dayUsers) {
        for (const uid of dayUsers) {
          cumulativeUsers.add(uid);
        }
      }

      daily.push({ date: dateStr, count: cumulativeUsers.size });
    }

    // Browser breakdown: all sessions with userAgent
    const allSessions = await prisma.session.findMany({
      where: { userAgent: { not: null } },
      select: { userAgent: true },
    });

    const browserCounts: Record<string, number> = {};
    for (const s of allSessions) {
      if (!s.userAgent || isBot(s.userAgent)) continue;
      // @ts-expect-error -- UAParser dual export (function+class) confuses TS; works at runtime
      const parser = new UAParser(s.userAgent);
      const browser = parser.getBrowser();
      const name = browser.name || "Unknown";
      browserCounts[name] = (browserCounts[name] || 0) + 1;
    }

    // Apply 5% threshold
    const totalBrowserCount = Object.values(browserCounts).reduce(
      (a, b) => a + b,
      0
    );
    const threshold = totalBrowserCount * 0.05;
    const browsers: { name: string; count: number; percentage: number }[] = [];
    let otherCount = 0;

    for (const [name, count] of Object.entries(browserCounts)) {
      if (count < threshold) {
        otherCount += count;
      } else {
        browsers.push({
          name,
          count,
          percentage:
            totalBrowserCount > 0
              ? Math.round((count / totalBrowserCount) * 100)
              : 0,
        });
      }
    }

    if (otherCount > 0) {
      browsers.push({
        name: "Other",
        count: otherCount,
        percentage:
          totalBrowserCount > 0
            ? Math.round((otherCount / totalBrowserCount) * 100)
            : 0,
      });
    }

    // Sort by count descending
    browsers.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      activeUsers: {
        total7d: uniqueUsers7d.size,
        total30d: uniqueUsers30d.size,
        daily,
      },
      browsers,
    });
  } catch (err) {
    console.error("Analytics API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
