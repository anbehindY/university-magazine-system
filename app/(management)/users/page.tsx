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
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, UserPlus } from "lucide-react";
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
  lastActiveAt?: string | null;
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

function formatRole(role: string | null) {
  if (!role) return "User";
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getUserStatus(user: Pick<UserRow, "banned" | "emailVerified">) {
  if (user.banned) return "Inactive";
  if (!user.emailVerified) return "Pending";
  return "Active";
}

function getStatusClasses(status: string) {
  if (status === "Active") {
    return "border-emerald-200 bg-emerald-100 text-emerald-700";
  }
  if (status === "Pending") {
    return "border-amber-200 bg-amber-100 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getLastActiveLabel(user: Pick<UserRow, "lastActiveAt">) {
  if (!user.lastActiveAt) return "Never";
  const lastActive = new Date(user.lastActiveAt);
  if (Number.isNaN(lastActive.getTime())) return "Never";
  return formatDistanceToNow(lastActive, { addSuffix: true });
}

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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [deactivateLoadingId, setDeactivateLoadingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [facultyId, setFacultyId] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<Role | "">("");
  const [editFacultyId, setEditFacultyId] = useState("");
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
    if (!dialogOpen && !editDialogOpen) return;

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
  }, [dialogOpen, editDialogOpen]);

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
  const requiresEditFaculty =
    editRole === "MARKETING_COORDINATOR" ||
    editRole === "GUEST" ||
    editRole === "STUDENT";

  function openEditDialog(user: UserRow) {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole((user.role as Role) || "STUDENT");
    setEditFacultyId(user.faculty?.id || "");
    setEditError(null);
    setEditSuccess(null);
    setEditDialogOpen(true);
  }

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

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
    setEditSuccess(null);
    setEditLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUserId,
          name: editName,
          email: editEmail,
          role: editRole,
          facultyId: requiresEditFaculty ? editFacultyId : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Failed to update user");
        return;
      }

      setEditSuccess("User updated successfully.");
      await refreshUsers();
      setEditDialogOpen(false);
    } catch {
      setEditError("An unexpected error occurred");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivateUser(userId: string) {
    if (deactivateLoadingId) return;
    setDeactivateLoadingId(userId);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          action: "deactivate",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to deactivate user");
        return;
      }
      await refreshUsers();
    } catch {
      setEditError("An unexpected error occurred");
    } finally {
      setDeactivateLoadingId(null);
    }
  }

  async function handleReactivateUser(userId: string) {
    if (deactivateLoadingId) return;
    setDeactivateLoadingId(userId);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          action: "reactivate",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to reactivate user");
        return;
      }
      await refreshUsers();
    } catch {
      setEditError("An unexpected error occurred");
    } finally {
      setDeactivateLoadingId(null);
    }
  }

  if (isPending) {
    return <LoadingScreen />;
  }

  if (!session?.user || session.user.role !== "ADMINISTRATOR") {
    return <LoadingScreen />;
  }

  return (
    <main className="space-y-6 text-slate-900">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="text-base text-slate-500">
          Manage user accounts, roles, and permissions
        </p>
      </div>

      <div className="border-t border-slate-200" />

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Users</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage and monitor user accounts
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
              <Button className="h-10 gap-2 rounded-lg bg-amber-400 px-4 text-sm font-medium text-slate-900 hover:bg-amber-500">
                <UserPlus className="h-4 w-4" />
                Add User
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

          <Dialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open);
              if (!open) {
                setEditError(null);
                setEditSuccess(null);
              }
            }}
          >
            <DialogContent className="bg-white border-slate-200 text-slate-900">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription className="text-slate-500">
                  Update user name, email, role, and faculty assignment.
                </DialogDescription>
              </DialogHeader>

              {editError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                  {editSuccess}
                </div>
              )}

              <form onSubmit={handleEditUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-slate-700">
                    Full Name
                  </Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-slate-700">
                    Role
                  </Label>
                  <Select
                    value={editRole}
                    onValueChange={(value) => setEditRole(value as Role)}
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
                        Marketing Coordinator
                      </SelectItem>
                      <SelectItem
                        value="MARKETING_MANAGER"
                        className="text-slate-900"
                      >
                        Marketing Manager
                      </SelectItem>
                      <SelectItem value="ADMINISTRATOR" className="text-slate-900">
                        Administrator
                      </SelectItem>
                      <SelectItem value="GUEST" className="text-slate-900">
                        Guest
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {requiresEditFaculty && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-faculty" className="text-slate-700">
                      Faculty <span className="text-red-500">*</span>
                    </Label>
                    <Select value={editFacultyId} onValueChange={setEditFacultyId}>
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
                  </div>
                )}

                <DialogFooter className="gap-3 sm:gap-3">
                  <Button
                    type="submit"
                    disabled={editLoading || (requiresEditFaculty && !editFacultyId)}
                    className="bg-slate-900 text-white hover:bg-slate-800"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading && !error && (
          <LoadingScreen className="min-h-[16vh]" spinnerClassName="h-6 w-6" />
        )}

        {!loading && !error && users.length === 0 && (
          <p className="text-slate-500">No users found.</p>
        )}

        {!loading && !error && users.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-sm font-medium">Last Active</th>
                  <th className="w-10 px-4 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const status = getUserStatus(user);
                  return (
                    <tr
                      key={user.id}
                      className="border-t border-slate-200 text-slate-900 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{user.email}</td>
                      <td className="px-4 py-3 text-sm">{formatRole(user.role)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`rounded-sm border px-2.5 py-0.5 text-xs font-medium ${getStatusClasses(status)}`}
                        >
                          {status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {getLastActiveLabel(user)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                              aria-label={`Actions for ${user.name}`}
                            >
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem
                              onClick={() => openEditDialog(user)}
                              className="cursor-pointer"
                            >
                              Edit
                            </DropdownMenuItem>
                            {user.banned ? (
                              <DropdownMenuItem
                                onClick={() => handleReactivateUser(user.id)}
                                className="cursor-pointer text-emerald-600"
                                disabled={deactivateLoadingId === user.id}
                              >
                                {deactivateLoadingId === user.id ? "Reactivating..." : "Reactivate"}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleDeactivateUser(user.id)}
                                className="cursor-pointer text-red-600"
                                disabled={deactivateLoadingId === user.id}
                              >
                                {deactivateLoadingId === user.id ? "Deactivating..." : "Deactivate"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
