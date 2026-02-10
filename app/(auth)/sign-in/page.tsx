"use client";

import { University } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await signIn.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (res.error) {
      setError(res.error.message || "Something went wrong.");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <main className="min-h-screen text-white">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black" />
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                <University className="h-4 w-4" />
              </span>
              University Magazine System
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Welcome back to the editorial dashboard.
            </h1>
            <p className="text-base text-white/70">
              Manage contributors, publish issues, and keep everything on track
              from a single place.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-white/60">
              <span className="rounded-full border border-white/10 px-3 py-1">
                Secure access
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Role-based controls
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Activity insights
              </span>
            </div>
          </section>

          <Card className="border-white/10 bg-white/5 shadow-2xl shadow-black/40">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="text-white/60">
                Use your university account credentials to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@university.edu"
                    required
                    autoComplete="email"
                    className="border-white/10 bg-black/40 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="border-white/10 bg-black/40 text-white placeholder:text-white/40"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-gray-200"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
