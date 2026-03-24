"use client";

import { useState, useEffect } from "react";
import { UserCog, Loader2, Shield, Crown, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProfiles, updateProfileRole } from "@/lib/services/profiles";
import { createAuditLog } from "@/lib/services/audit";
import { useRole } from "@/lib/contexts/role-context";
import type { Profile } from "@/lib/types/database";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  viewer: "Viewer",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  viewer: "bg-gray-100 text-gray-700 border-gray-200",
};

const roleIcons: Record<string, typeof Crown> = {
  super_admin: Crown,
  manager: Shield,
  viewer: Eye,
};

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, canEdit, userId, userName } = useRole();

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (profile: Profile, newRole: string) => {
    if (profile.user_id === userId) {
      toast.error("You cannot change your own role.");
      return;
    }
    try {
      const updated = await updateProfileRole(profile.id, newRole);
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? updated : p)));
      await createAuditLog({
        user_name: userName || "Unknown",
        action: "update_role",
        entity_type: "profile",
        entity_id: profile.id,
        details: { user: profile.full_name, from: profile.role, to: newRole },
      });
      toast.success(`Role updated to ${roleLabels[newRole]} for ${profile.full_name}.`);
    } catch {
      toast.error("Failed to update role.");
    }
  };

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const adminCount = profiles.filter((p) => p.role === "super_admin").length;
  const managerCount = profiles.filter((p) => p.role === "manager").length;
  const viewerCount = profiles.filter((p) => p.role === "viewer").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage system users and assign roles.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
            <Crown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{adminCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Managers</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{managerCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viewers</CardTitle>
            <Eye className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{viewerCount}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" />All Users</CardTitle>
          <CardDescription>{profiles.length} registered users</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead>Change Role</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => {
                  const RoleIcon = roleIcons[profile.role] || Eye;
                  const isSelf = profile.user_id === userId;
                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {profile.full_name}
                          {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{profile.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[profile.role] || roleColors.viewer}>
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {roleLabels[profile.role] || "Viewer"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{profile.created_at?.split("T")[0] || "-"}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground">Cannot change own role</span>
                          ) : (
                            <Select value={profile.role} onValueChange={(value: string) => handleRoleChange(profile, value)}>
                              <SelectTrigger className="w-[150px] h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Role Permissions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold">Super Admin</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>&#x2713; View all data</li>
                <li>&#x2713; Create, edit, delete everything</li>
                <li>&#x2713; Manage user roles</li>
                <li>&#x2713; Access all settings</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold">Manager</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>&#x2713; View all data</li>
                <li>&#x2713; Create, edit, delete data</li>
                <li>&#x2717; Cannot manage user roles</li>
                <li>&#x2717; Cannot access user management</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold">Viewer</h3>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>&#x2713; View all data and reports</li>
                <li>&#x2717; Cannot create or edit data</li>
                <li>&#x2717; Cannot delete anything</li>
                <li>&#x2717; Read-only access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
