"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const nameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type NameFormValues = z.infer<typeof nameSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

function formatRole(role: string) {
  const labels: Record<string, string> = {
    MARKETING_COORDINATOR: "Coordinator",
    MARKETING_MANAGER: "Manager",
    ADMINISTRATOR: "Admin",
    STUDENT: "Student",
    GUEST: "Guest",
  };
  return labels[role] ?? role.replaceAll("_", " ");
}

type ProfileData = {
  name: string;
  email: string;
  role: string;
  facultyName: string | null;
};

export default function GuestProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const nameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: "" },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data: { user?: ProfileData; error?: string }) => {
        if (data.user) {
          setProfile(data.user);
          nameForm.reset({ name: data.user.name });
        }
      })
      .catch(() => {
        toast.error("Failed to load profile");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onNameSubmit(values: NameFormValues) {
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        setProfile((prev) =>
          prev ? { ...prev, name: data.name } : prev
        );
        toast.success("Name updated successfully");
      } else {
        toast.error(data.error || "Failed to update name");
      }
    } catch {
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
    }
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password changed successfully");
        passwordForm.reset();
      } else {
        toast.error(data.error || "Failed to change password");
      }
    } catch {
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-8 w-56" />
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-28" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-36" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Profile Settings
      </h1>

      {/* Section 1: Profile Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your display name. Email, role, and faculty cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Read-only fields */}
          <div className="mb-6 space-y-3">
            <div>
              <span className="text-sm font-medium text-slate-700">Email</span>
              <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700">Role</span>
              <p className="mt-1 text-sm text-slate-500">
                {profile?.role ? formatRole(profile.role) : "-"}
              </p>
            </div>
            {profile?.facultyName && (
              <div>
                <span className="text-sm font-medium text-slate-700">
                  Faculty
                </span>
                <p className="mt-1 text-sm text-slate-500">
                  {profile.facultyName}
                </p>
              </div>
            )}
          </div>

          {/* Editable name */}
          <Form {...nameForm}>
            <form
              onSubmit={nameForm.handleSubmit(onNameSubmit)}
              className="space-y-4"
            >
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Your name"
                        className="border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={savingName}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {savingName && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Name
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Section 2: Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password and choose a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter current password"
                        className="border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="At least 8 characters"
                        className="border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Confirm new password"
                        className="border-slate-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={savingPassword}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {savingPassword && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
