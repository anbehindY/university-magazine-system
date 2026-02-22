"use client";

import { Badge } from "@/components/ui/badge";
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const requiresFaculty =
    role === "MARKETING_COORDINATOR" ||
    role === "GUEST" ||
    role === "STUDENT";

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
    return <p className="text-slate-600">Loading...</p>;
  }

  if (!session?.user || session.user.role !== "ADMINISTRATOR") {
    return <p className="text-slate-600">Redirecting...</p>;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedQuery) return true;
    return (
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      (user.role || "").toLowerCase().includes(normalizedQuery) ||
      (user.faculty?.name || "").toLowerCase().includes(normalizedQuery)
    );
  });

  const totalCount = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex =
    totalCount === 0
      ? 0
      : Math.min(currentPage * pageSize, totalCount);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <main className="space-y-6 text-slate-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Users</h1>
          <p className="text-sm text-slate-500">
            Manage access and permissions across your magazine staff.
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
            <Button className="bg-slate-900 text-white hover:bg-slate-800">
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription className="text-slate-500">
                Create a new user account with a specific role.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-700">
                  Role
                </Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as Role)}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="STUDENT" className="text-slate-900">
                      Student
                    </SelectItem>
                    <SelectItem
                      value="MARKETING_COORDINATOR"
                      className="text-slate-900"
                    >
                      Marketing Coordinator (Faculty level)
                    </SelectItem>
                    <SelectItem
                      value="MARKETING_MANAGER"
                      className="text-slate-900"
                    >
                      Marketing Manager (University level)
                    </SelectItem>
                    <SelectItem value="ADMINISTRATOR" className="text-slate-900">
                      Administrator
                    </SelectItem>
                    <SelectItem value="GUEST" className="text-slate-900">
                      Guest (Faculty level)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-500">
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
                  <Label htmlFor="faculty" className="text-slate-700">
                    Faculty <span className="text-red-500">*</span>
                  </Label>
                  <Select value={facultyId} onValueChange={setFacultyId}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select a faculty" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {faculties.length === 0 ? (
                        <SelectItem
                          value="none"
                          disabled
                          className="text-slate-400"
                        >
                          No faculties available
                        </SelectItem>
                      ) : (
                        faculties.map((faculty) => (
                          <SelectItem
                            key={faculty.id}
                            value={faculty.id}
                            className="text-slate-900"
                          >
                            {faculty.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-500">
                    This user will only have access to their assigned faculty
                  </p>
                </div>
              )}

              <DialogFooter className="gap-3 sm:gap-3">
                <Button
                  type="submit"
                  disabled={formLoading || (requiresFaculty && !facultyId)}
                  className="bg-slate-900 text-white hover:bg-slate-800"
                >
                  {formLoading ? "Creating..." : "Create User"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, role, or faculty"
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading && !error && <p className="text-slate-500">Loading users...</p>}

      {!loading && !error && users.length === 0 && (
        <p className="text-slate-500">No users found.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
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
              {pagedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-slate-200 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {(user.role || "User").replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.faculty?.name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          user.banned
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {user.banned ? "Banned" : "Active"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !error && filteredUsers.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              No users match your search.
            </div>
          )}
        </div>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <div>
            Showing {startIndex}–{endIndex} of {totalCount}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((prev) => Math.min(totalPages, prev + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
