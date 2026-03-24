"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export type AppRole = "super_admin" | "manager" | "viewer";

interface RoleContextType {
  role: AppRole;
  loading: boolean;
  userId: string | null;
  userName: string | null;
  canEdit: boolean; // super_admin or manager
  canDelete: boolean; // super_admin or manager
  isAdmin: boolean; // super_admin only
}

const RoleContext = createContext<RoleContextType>({
  role: "viewer",
  loading: true,
  userId: null,
  userName: null,
  canEdit: false,
  canDelete: false,
  isAdmin: false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "User");

        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setRole(profile.role as AppRole);
        } else {
          // First user gets super_admin, others get viewer
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true });

          const assignedRole: AppRole = count === 0 ? "super_admin" : "viewer";

          // Create profile
          await supabase.from("profiles").insert({
            user_id: user.id,
            organization_id: "00000000-0000-0000-0000-000000000001",
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            email: user.email || "",
            role: assignedRole,
          });

          setRole(assignedRole);
        }
      } catch (error) {
        console.error("Failed to fetch role:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  const canEdit = role === "super_admin" || role === "manager";
  const canDelete = role === "super_admin" || role === "manager";
  const isAdmin = role === "super_admin";

  return (
    <RoleContext.Provider value={{ role, loading, userId, userName, canEdit, canDelete, isAdmin }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
