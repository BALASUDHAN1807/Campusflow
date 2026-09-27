import { useNavigate } from "react-router-dom";
import { User, Mail, Shield, LogOut, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";

export function StudentProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <User className="w-7 h-7 text-blue-600" />
          Student Account Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your authenticated identity, permissions, and session details on CampusFlow.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white text-blue-700 flex items-center justify-center font-extrabold text-2xl shadow-lg border-2 border-white/50">
              {initials}
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">{user?.name || "Student"}</CardTitle>
              <CardDescription className="text-blue-100 flex items-center gap-2 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block font-medium">Account Role</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-600 text-white font-semibold">STUDENT</Badge>
                <span className="text-muted-foreground text-[11px]">(Fair-queue enabled)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block font-medium">Session Verification</span>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>JWT Cookie Authenticated</span>
              </div>
            </div>
          </div>

          {/* Policy Badges */}
          <div className="p-4 rounded-xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              Smart Hold & Fairness Rights
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
              <li>Protected Smart Hold reservations on any active campus queue.</li>
              <li>Bounded Fair-Skip protection against premature queue ejection.</li>
              <li>Real-time dynamic derived queue positioning without static locks.</li>
            </ul>
          </div>

          {/* Logout Action */}
          <div className="pt-4 border-t border-border flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Sign out of this browser session
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="text-xs flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
