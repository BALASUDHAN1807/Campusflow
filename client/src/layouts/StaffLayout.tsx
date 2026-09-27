import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
} from "lucide-react";

import { BrandLogo } from "@/components/common/BrandLogo";
import { ApiHealthBanner } from "@/components/common/ApiHealthBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

const staffNavItems = [
  {
    title: "Dashboard",
    path: "/staff",
    icon: LayoutDashboard,
    badge: "Live",
  },
  {
    title: "Queue Control",
    path: "/staff/queue",
    icon: Users,
    badge: null,
  },
  {
    title: "Event Log",
    path: "/staff/events",
    icon: ScrollText,
    badge: null,
  },
  {
    title: "Analytics",
    path: "/staff/analytics",
    icon: BarChart3,
    badge: null,
  },
  {
    title: "Fairness Simulator",
    path: "/staff/simulator",
    icon: Activity,
    badge: "Demo",
  },
  {
    title: "Settings",
    path: "/staff/settings",
    icon: Settings,
    badge: null,
  },
];


export function StaffLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "ST";

  return (
    <div className="min-h-screen flex flex-col bg-slate-900/5 dark:bg-slate-950">
      {/* Backend API Health Banner */}
      <ApiHealthBanner />

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Staff Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="px-2 pt-2">
              <BrandLogo size="md" />
              <div className="mt-2 flex items-center justify-between px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200/50 text-indigo-700 text-xs font-semibold dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  Staff Operations
                </span>
                <span className="text-[10px] bg-indigo-200/60 dark:bg-indigo-800 px-1 rounded">
                  Desk #04
                </span>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="space-y-1">
              {staffNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm dark:bg-primary dark:text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5",
                          isActive
                            ? "bg-white/20 text-white"
                            : item.title === "Live Operations"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom user profile & logout */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40">
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">
                  {user?.name || "Staff Operator"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || "staff@campusflow.demo"}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 justify-start"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between border-b border-border bg-card p-3">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700">
              Staff Desk #04
            </Badge>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card p-4 space-y-3">
            <div className="p-2 rounded-lg bg-muted/50 text-xs">
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
            <nav className="space-y-1">
              {staffNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full text-xs text-destructive hover:bg-destructive/10 justify-start"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        )}

        {/* Staff Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
