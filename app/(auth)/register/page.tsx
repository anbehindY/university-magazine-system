"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { University } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    facultyId: z.string().min(1, "Faculty is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

interface Faculty {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [emailStatus, setEmailStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      facultyId: "",
    },
  });

  // Fetch faculties on mount
  useEffect(() => {
    fetch("/api/faculties")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFaculties(data);
        } else if (Array.isArray(data?.faculties)) {
          setFaculties(data.faculties);
        }
      })
      .catch(() => {
        // Silently fail -- faculty dropdown will be empty
      });
  }, []);

  function handleEmailBlur() {
    const email = form.getValues("email").trim();
    if (!email || form.formState.errors.email) {
      setEmailStatus("idle");
      return;
    }

    if (emailCheckTimer.current) {
      clearTimeout(emailCheckTimer.current);
    }

    setEmailStatus("checking");
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/register/check-email?email=${encodeURIComponent(email)}`
        );
        const data = await res.json();
        setEmailStatus(data.available ? "available" : "taken");
      } catch {
        setEmailStatus("idle");
      }
    }, 500);
  }

  async function handleSubmit(values: RegisterValues) {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          facultyId: values.facultyId,
        }),
      });

      const data = await res.json();

      if (res.status === 201) {
        toast.success(
          "Registration successful! Please sign in with your new account."
        );
        setTimeout(() => router.push("/sign-in"), 1500);
        return;
      }

      if (res.status === 409) {
        setError("Email already registered.");
      } else if (res.status === 400) {
        setError(data.error || "Invalid input. Please check your details.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Unable to register right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-slate-900">
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
              Join as a guest reviewer.
            </h1>
            <p className="text-base text-slate-600">
              Register to view selected submissions from your faculty. Your
              account will be ready to use immediately after registration.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                View submissions
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Faculty-specific access
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Instant activation
              </span>
            </div>
          </section>

          <Card className="border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Register as Guest</CardTitle>
              <CardDescription className="text-slate-500">
                Create an account to view selected submissions
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">
                          Full Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your full name"
                            autoComplete="name"
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
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                            {...field}
                            onBlur={(e) => {
                              field.onBlur();
                              handleEmailBlur();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        {emailStatus === "checking" && (
                          <p className="text-xs text-slate-500">
                            Checking availability...
                          </p>
                        )}
                        {emailStatus === "taken" && (
                          <p className="text-xs text-red-600">
                            This email is already registered.
                          </p>
                        )}
                        {emailStatus === "available" && (
                          <p className="text-xs text-green-600">
                            Email is available.
                          </p>
                        )}
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
                            placeholder="Repeat your password"
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
                    name="facultyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">
                          Faculty
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full border-slate-200 bg-white text-slate-900">
                              <SelectValue placeholder="Select your faculty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {faculties.map((faculty) => (
                              <SelectItem key={faculty.id} value={faculty.id}>
                                {faculty.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {loading ? "Registering..." : "Register"}
                  </Button>
                </form>
              </Form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/sign-in"
                  className="text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
