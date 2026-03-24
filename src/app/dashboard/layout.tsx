"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  Banknote,
  PiggyBank,
  Calculator,
  BarChart3,
  UserCog,
  Shield,
  Settings,
  Menu,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { signOut, getUser } from "@/lib/services/auth";
import { RoleProvider, useRole } from "@/lib/contexts/role-context";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/loans", label: "Loans", icon: Banknote },
  { href: "/dashboard/savings", label: "Savings", icon: PiggyBank },
  { href: "/dashboard/accounting", label: "Accounting", icon: Calculator },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/users", label: "Users", icon: UserCog, adminOnly: true },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  viewer: "Viewer",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  manager: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
};

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canEdit } = useRole();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {navItems
        .filter((item) => !item.adminOnly || canEdit)
        .map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
    </nav>
  );
}

function getUserDisplayName(user: User | null): string {
  if (!user) return "User";
  const fullName = user.user_metadata?.full_name;
  if (fullName) return fullName;
  return user.email?.split("@")[0] ?? "User";
}

function getUserInitials(user: User | null): string {
  const name = getUserDisplayName(user);
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function RoleBadge() {
  const { role } = useRole();
  return (
    <span
      className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[role] || roleColors.viewer}`}
    >
      {roleLabels[role] || "Viewer"}
    </span>
  );
}

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      // Ignore
    }
    router.push("/login");
  };

  const displayName = getUserDisplayName(user);
  const initials = getUserInitials(user);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            T
          </div>
          <span className="text-lg font-bold text-gray-900">TSK</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden" />
                }
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <SheetHeader className="border-b border-gray-200 px-6">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                      T
                    </div>
                    TSK
                  </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h2 className="text-sm font-semibold text-gray-900">TSK Tontine</h2>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            <RoleBadge />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-100" />
                }
              >
                <Avatar size="sm">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden font-medium text-gray-700 sm:inline">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProvider>
      <DashboardInner>{children}</DashboardInner>
    </RoleProvider>
  );
}
