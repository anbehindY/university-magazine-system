"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  emailVerified: boolean;
  banned: boolean | null;
  createdAt: string;
  faculty: { id: string; name: string } | null;
};

type Role =
  | "MARKETING_MANAGER"
  | "MARKETING_COORDINATOR"
  | "STUDENT"
  | "ADMINISTRATOR"
  | "GUEST";

type Faculty = {
  id: string;
  name: string;
};

export default function UsersPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [facultyId, setFacultyId] = useState("");
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  useEffect(() => {
    if (!isPending && (!session?.user || session.user.role !== "ADMINISTRATOR")) {
      router.push("/dashboard");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (isPending || !session?.user || session.user.role !== "ADMINISTRATOR") {
      return;
    }

    let cancelled = false;

    async function fetchUsers() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Failed to load users.");
          setUsers([]);
          return;
        }

        setUsers(data.users || []);
      } catch {
        if (!cancelled) {
          setError("Failed to load users.");
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, [isPending, session?.user, session?.user?.role]);

  useEffect(() => {
    if (!dialogOpen) return;

    let cancelled = false;
    async function fetchFaculties() {
      try {
        const res = await fetch("/api/faculties");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFaculties(data.faculties || []);
      } catch {
        if (!cancelled) setFaculties([]);
      }
    }
    fetchFaculties();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen]);

  async function refreshUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError("Failed to load users.");
      setUsers([]);
    }
  }

  const requiresFaculty = role === "MARKETING_COORDINATOR" || role === "GUEST";

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          facultyId: requiresFaculty ? facultyId : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        return;
      }

      setFormSuccess(`User ${data.user.name} created successfully!`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("");
      setFacultyId("");
      await refreshUsers();
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setFormLoading(false);
    }
  }

  if (isPending) {
    return <p className="text-white">Loading...</p>;
  }

  if (!session?.user || session.user.role !== "ADMINISTRATOR") {
    return <p className="text-white">Redirecting...</p>;
  }

  return (
    <main className="space-y-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-sm text-gray-400">
            Total users: {loading ? "..." : users.length}
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setFormError(null);
              setFormSuccess(null);
              setName("");
              setEmail("");
              setPassword("");
              setRole("");
              setFacultyId("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-gray-200">
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-950 border-neutral-800 text-white">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new user account with a specific role.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-md">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-md">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-700 text-white"
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-neutral-900 border-neutral-700 text-white"
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-neutral-900 border-neutral-700 text-white"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-white">
                  Role
                </Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as Role)}
                >
                  <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-700">
                    <SelectItem value="STUDENT" className="text-white">
                      Student
                    </SelectItem>
                    <SelectItem
                      value="MARKETING_COORDINATOR"
                      className="text-white"
                    >
                      Marketing Coordinator (Faculty level)
                    </SelectItem>
                    <SelectItem
                      value="MARKETING_MANAGER"
                      className="text-white"
                    >
                      Marketing Manager (University level)
                    </SelectItem>
                    <SelectItem value="ADMINISTRATOR" className="text-white">
                      Administrator
                    </SelectItem>
                    <SelectItem value="GUEST" className="text-white">
                      Guest (Faculty level)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-400">
                  {role === "MARKETING_MANAGER" &&
                    "Can view all contributions and download as ZIP after final closure date"}
                  {role === "MARKETING_COORDINATOR" &&
                    "Can manage contributions for their faculty and interact with students"}
                  {role === "STUDENT" &&
                    "Can submit articles and upload images"}
                  {role === "ADMINISTRATOR" &&
                    "Can maintain system data and manage closure dates"}
                  {role === "GUEST" &&
                    "Read-only access to selected reports for their faculty"}
                </p>
              </div>

              {requiresFaculty && (
                <div className="space-y-2">
                  <Label htmlFor="faculty" className="text-white">
                    Faculty <span className="text-red-500">*</span>
                  </Label>
                  <Select value={facultyId} onValueChange={setFacultyId}>
                    <SelectTrigger className="bg-neutral-900 border-neutral-700 text-white">
                      <SelectValue placeholder="Select a faculty" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-700">
                      {faculties.length === 0 ? (
                        <SelectItem
                          value="none"
                          disabled
                          className="text-gray-400"
                        >
                          No faculties available
                        </SelectItem>
                      ) : (
                        faculties.map((faculty) => (
                          <SelectItem
                            key={faculty.id}
                            value={faculty.id}
                            className="text-white"
                          >
                            {faculty.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-400">
                    This user will only have access to their assigned faculty
                  </p>
                </div>
              )}

              <DialogFooter className="gap-3 sm:gap-3">
                <Button
                  type="submit"
                  disabled={formLoading || (requiresFaculty && !facultyId)}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  {formLoading ? "Creating..." : "Create User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-neutral-700 text-white hover:bg-neutral-800"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md border border-red-500 bg-red-500/10 px-4 py-3 text-red-400">
          {error}
        </div>
      )}

      {loading && !error && <p className="text-gray-400">Loading users...</p>}

      {!loading && !error && users.length === 0 && (
        <p className="text-gray-400">No users found.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Faculty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-neutral-800">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role || "-"}</td>
                  <td className="px-4 py-3">{user.faculty?.name || "-"}</td>
                  <td className="px-4 py-3">
                    {user.banned ? "Banned" : "Active"}
                    {!user.emailVerified ? " / Unverified" : ""}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
