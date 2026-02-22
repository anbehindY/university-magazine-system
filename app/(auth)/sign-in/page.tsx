"use client";

import { University } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const signInSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInValues = z.infer<typeof signInSchema>;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

function hasSuspiciousInput(value: string): boolean {
  const lowered = value.toLowerCase();
  const suspiciousPatterns = [
    "<",
    ">",
    "'",
    "\"",
    "--",
    ";",
    "/*",
    "*/",
    " union ",
    " select ",
    " or ",
    " drop ",
    " insert ",
    " update ",
    " delete ",
  ];

  return suspiciousPatterns.some((pattern) => lowered.includes(pattern));
}

function getFriendlyAuthError(error: unknown): string {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message.toLowerCase()
      : "";

  if (
    message.includes("invalid") ||
    message.includes("credential") ||
    message.includes("password") ||
    message.includes("email") ||
    message.includes("user not found")
  ) {
    return INVALID_CREDENTIALS_MESSAGE;
  }

  return "Unable to sign in right now. Please try again.";
}

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function handleSubmit(values: SignInValues) {
    setError(null);
    setLoading(true);
    let didRedirect = false;

    if (
      hasSuspiciousInput(values.email) ||
      hasSuspiciousInput(values.password)
    ) {
      setError(INVALID_CREDENTIALS_MESSAGE);
      setLoading(false);
      return;
    }

    try {
      const res = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (res.error) {
        setError(getFriendlyAuthError(res.error));
        return;
      }

      didRedirect = true;
      setIsRedirecting(true);
      router.push("/");
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      if (!didRedirect) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="min-h-screen text-slate-900">
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm transition-opacity duration-300 ${
          isRedirecting ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isRedirecting}
      >
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-10 py-8 shadow-2xl shadow-slate-200/70">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-300/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />
          <div className="relative flex flex-col items-center gap-4">
            <div className="loading-float relative flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-2 border-slate-900/70 border-t-transparent animate-spin" />
              <div className="absolute h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-slate-900">
                Signing you in
              </p>
              <p className="text-sm text-slate-500">
                Preparing your dashboard...
              </p>
            </div>
            <div className="relative h-2 w-56 overflow-hidden rounded-full bg-slate-100">
              <div className="loading-shimmer absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-slate-400/70 to-transparent" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="loading-pulse-soft">Authenticating</span>
              <span className="loading-pulse-soft delay-150">•</span>
              <span className="loading-pulse-soft delay-300">Loading workspace</span>
            </div>
          </div>
        </div>
      </div>
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100" />
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <University className="h-4 w-4" />
              </span>
              University Magazine System
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Welcome back to the editorial dashboard.
            </h1>
            <p className="text-base text-slate-600">
              Manage contributors, publish issues, and keep everything on track
              from a single place.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Secure access
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Role-based controls
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Activity insights
              </span>
            </div>
          </section>

          <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription className="text-slate-500">
                Use your university account credentials to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 rounded-md border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  noValidate
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@university.edu"
                            autoComplete="email"
                            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={loading || isRedirecting}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {loading || isRedirecting ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
