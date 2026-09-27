import { useState, useEffect } from "react";
import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  Bell,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { ApiHealthBanner } from "@/components/common/ApiHealthBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { notificationService } from "@/services/notificationService";
import { cn } from "@/lib/utils";

export function StudentLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    const loadUnread = async () => {
      try {
        const res = await notificationService.getNotifications();
        if (res.success && res.data && isMounted) {
          setUnreadCount(res.data.unreadCount || 0);
        }
      } catch {
        // silent polling catch
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

  const studentNavItems = [
    {
      title: "Dashboard",
      path: "/student",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      title: "My Queue",
      path: "/student/queue",
      icon: Clock,
      badge: null,
    },
    {
      title: "Notifications",
      path: "/student/notifications",
      icon: Bell,
      badge: unreadCount > 0 ? String(unreadCount) : null,
    },
    {
      title: "Profile",
      path: "/student/profile",
      icon: User,
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950">
      {/* Backend API Health Indicator */}
      <ApiHealthBanner />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 shrink-0 justify-between">
          <div className="space-y-6">
            <div className="px-2 pt-2">
              <BrandLogo size="md" />
              <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium dark:bg-blue-950/40 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Student Portal</span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="space-y-1">
              {studentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <Badge
                        variant={isActive ? "secondary" : "default"}
                        className={cn(
                          "text-[10px] px-1.5 py-0 h-5",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-blue-600 text-white"
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
            <Link
              to="/student/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">
                  {user?.name || "Student"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || "student@campusflow.demo"}
                </p>
              </div>
            </Link>

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
            <Link to="/student/notifications">
              <Button size="icon" variant="ghost" className="relative h-8 w-8">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-card" />
                )}
              </Button>
            </Link>
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

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-card p-4 space-y-3">
            <Link
              to="/student/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg bg-muted/50 text-xs block"
            >
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{user?.email}</p>
            </Link>
            <nav className="space-y-1">
              {studentNavItems.map((item) => {
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
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">
                        {item.badge}
                      </Badge>
                    )}
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

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
