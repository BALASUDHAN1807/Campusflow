import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Sparkles, GraduationCap, Building2 } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/authStore";
import { ApiHealthBanner } from "@/components/common/ApiHealthBanner";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      // Determine destination
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && ((user.role === "STAFF" && from.startsWith("/staff")) || (user.role === "STUDENT" && from.startsWith("/student")))) {
        navigate(from, { replace: true });
      } else {
        navigate(user.role === "STAFF" ? "/staff" : "/student", { replace: true });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password.";
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLocalError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 dark:bg-slate-950">
      <ApiHealthBanner />

      <header className="p-4 border-b border-border/60 flex items-center justify-between max-w-7xl mx-auto w-full">
        <BrandLogo size="md" />
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-xs">
            Back to Home
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 my-8">
        <div className="w-full max-w-md space-y-4">
          <Card className="shadow-card-hover border-border">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl font-bold">Sign In to CampusFlow</CardTitle>
              <CardDescription>
                Enter your university credentials to access live queue services
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {localError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    University Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="e.g. student@campusflow.demo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9 text-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Demo Account Quick-Fill Box */}
              <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Seeded Demo Credentials</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 flex flex-col items-start text-left bg-card hover:bg-accent"
                    onClick={() => fillDemoAccount("student@campusflow.demo", "Student@123")}
                  >
                    <span className="font-bold flex items-center gap-1 text-blue-600">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Demo Student
                    </span>
                    <span className="text-[10px] text-muted-foreground">student@campusflow.demo</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 flex flex-col items-start text-left bg-card hover:bg-accent"
                    onClick={() => fillDemoAccount("staff@campusflow.demo", "Staff@123")}
                  >
                    <span className="font-bold flex items-center gap-1 text-indigo-600">
                      <Building2 className="w-3.5 h-3.5" />
                      Demo Staff
                    </span>
                    <span className="text-[10px] text-muted-foreground">staff@campusflow.demo</span>
                  </Button>
                </div>
              </div>

              {/* Register Link */}
              <div className="text-center pt-2 border-t border-border text-xs text-muted-foreground">
                Don't have a student account?{" "}
                <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                  Create Account
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
