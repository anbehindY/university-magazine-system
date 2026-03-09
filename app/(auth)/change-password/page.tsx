"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
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

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  async function handleSubmit(values: FormValues) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to change password.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      const destination =
        session?.user?.role === "GUEST" ? "/guest" : "/";
      setTimeout(() => router.push(destination), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-slate-900">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100" />
        <div className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-16">
          <Card className="w-full border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader className="space-y-3">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  {success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                </span>
                Security
              </div>
              <CardTitle className="text-2xl">
                {success ? "Password Changed" : "Change Your Password"}
              </CardTitle>
              <CardDescription className="text-slate-500">
                {success
                  ? "Your password has been updated successfully. Redirecting you now..."
                  : "Your administrator has set a temporary password. Please choose a new password to continue."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Password changed successfully. Redirecting...
                </div>
              ) : (
                <>
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
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">
                              New Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
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
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">
                              Confirm Password
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Re-enter your new password"
                                autoComplete="new-password"
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
                        disabled={loading}
                        className="w-full bg-slate-900 text-white hover:bg-slate-800"
                      >
                        {loading ? "Changing password..." : "Change Password"}
                      </Button>
                    </form>
                  </Form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
