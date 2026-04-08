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
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";

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
  | "ADMINISTRATOR";
type EditRole = Role | "GUEST";

type Faculty = {
  id: string;
  name: string;
};

type UserSortOption =
  | "LAST_ACTIVE_DESC"
  | "LAST_ACTIVE_ASC"
  | "NAME_ASC"
  | "NAME_DESC"
  | "EMAIL_ASC"
  | "EMAIL_DESC"
  | "ROLE_ASC"
  | "ROLE_DESC"
  | "STATUS_ASC"
  | "STATUS_DESC";

type RoleFilterOption = "ALL" | EditRole;
type StatusFilterOption = "ALL" | "ACTIVE" | "PENDING" | "INACTIVE";

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [emailSearch, setEmailSearch] = useState("");
  const [sortBy, setSortBy] = useState<UserSortOption>("LAST_ACTIVE_DESC");
  const [roleFilter, setRoleFilter] = useState<RoleFilterOption>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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
  const [editRole, setEditRole] = useState<EditRole | "">("");
  const [editFacultyId, setEditFacultyId] = useState("");
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  useEffect(() => {
    if (!isPending && (!session?.user || session.user.role !== "ADMINISTRATOR")) {
      router.push("/dashboard");
    }
  }, [isPending, session, router]);

  function buildUsersQuery() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
    });
    const normalizedEmailSearch = emailSearch.trim();
    if (normalizedEmailSearch) {
      params.set("search", normalizedEmailSearch);
    }
    if (roleFilter !== "ALL") {
      params.set("role", roleFilter);
    }
    if (statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    return params.toString();
  }

  useEffect(() => {
    if (isPending || !session?.user || session.user.role !== "ADMINISTRATOR") {
      return;
    }

    let cancelled = false;

    async function fetchUsers() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/users?${buildUsersQuery()}`);
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Failed to load users.");
          setUsers([]);
          return;
        }

        setUsers(data.users || []);
        setTotal(data.total || 0);
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
  }, [isPending, session?.user, session?.user?.role, page, pageSize, sortBy, emailSearch, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [emailSearch, sortBy, roleFilter, statusFilter]);

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
      const res = await fetch(`/api/admin/users?${buildUsersQuery()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load users.");
        setUsers([]);
        return;
      }
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load users.");
      setUsers([]);
    }
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  const requiresFaculty =
    role === "MARKETING_COORDINATOR" ||
    role === "STUDENT";
  const requiresEditFaculty =
    editRole === "MARKETING_COORDINATOR" ||
    editRole === "STUDENT";
  const isEditingGuest = editRole === "GUEST";

  function openEditDialog(user: UserRow) {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole((user.role as EditRole) || "STUDENT");
    setEditFacultyId(user.faculty?.id || "");
    setEditError(null);
    setEditDialogOpen(true);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
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

      toast.success("User created successfully.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("");
      setFacultyId("");
      await refreshUsers();
      setDialogOpen(false);
    } catch {
      setFormError("An unexpected error occurred");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);
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
          facultyId: isEditingGuest
            ? editFacultyId || null
            : requiresEditFaculty
              ? editFacultyId
              : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Failed to update user");
        return;
      }

      toast.success("User updated successfully.");
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
      toast.success("User deactivated.");
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
      toast.success("User reactivated.");
    } catch {
      setEditError("An unexpected error occurred");
    } finally {
      setDeactivateLoadingId(null);
    }
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

                {!isEditingGuest && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-role" className="text-slate-700">
                      Role
                    </Label>
                    <Select
                      value={editRole}
                      onValueChange={(value) => setEditRole(value as EditRole)}
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
                )}

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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="email"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            placeholder="Find by email"
            className="h-9 w-full border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 sm:w-72"
          />
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as UserSortOption)}>
            <SelectTrigger className="h-9 w-full border-slate-200 text-sm text-slate-700 sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LAST_ACTIVE_DESC">Last Active (Newest)</SelectItem>
              <SelectItem value="LAST_ACTIVE_ASC">Last Active (Oldest)</SelectItem>
              <SelectItem value="NAME_ASC">Name (A-Z)</SelectItem>
              <SelectItem value="NAME_DESC">Name (Z-A)</SelectItem>
              <SelectItem value="EMAIL_ASC">Email (A-Z)</SelectItem>
              <SelectItem value="EMAIL_DESC">Email (Z-A)</SelectItem>
              <SelectItem value="ROLE_ASC">Role (A-Z)</SelectItem>
              <SelectItem value="ROLE_DESC">Role (Z-A)</SelectItem>
              <SelectItem value="STATUS_ASC">Status (Active-Pending-Inactive)</SelectItem>
              <SelectItem value="STATUS_DESC">Status (Inactive-Pending-Active)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as RoleFilterOption)}
          >
            <SelectTrigger className="h-9 w-full border-slate-200 text-sm text-slate-700 sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Role: All</SelectItem>
              <SelectItem value="ADMINISTRATOR">Role: Administrator</SelectItem>
              <SelectItem value="MARKETING_MANAGER">Role: Marketing Manager</SelectItem>
              <SelectItem value="MARKETING_COORDINATOR">Role: Marketing Coordinator</SelectItem>
              <SelectItem value="STUDENT">Role: Student</SelectItem>
              <SelectItem value="GUEST">Role: Guest</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilterOption)}
          >
            <SelectTrigger className="h-9 w-full border-slate-200 text-sm text-slate-700 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Status: All</SelectItem>
              <SelectItem value="ACTIVE">Status: Active</SelectItem>
              <SelectItem value="PENDING">Status: Pending</SelectItem>
              <SelectItem value="INACTIVE">Status: Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[760px] w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-sm font-medium">Last Active</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {[...Array(pageSize)].map((_, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-28 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-sm" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-8 rounded-md" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && users.length === 0 && (
          <p className="text-slate-500">No users found.</p>
        )}

        {!loading && !error && users.length > 0 && (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-[760px] w-full text-left">
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
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
          </>
        )}
      </section>
    </main>
  );
}
