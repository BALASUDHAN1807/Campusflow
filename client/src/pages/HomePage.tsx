import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Clock,
  Shuffle,
  BarChart3,
  BellRing,
  GraduationCap,
  Building2,
} from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiHealthBanner } from "@/components/common/ApiHealthBanner";

export function HomePage() {
  const features = [
    {
      icon: Clock,
      title: "Smart Hold System",
      description:
        "Need to step away to print a document or attend a quick lecture? Put your token on Smart Hold for up to 10 minutes without losing your place in line.",
      badge: "Flagship Feature",
    },
    {
      icon: Shuffle,
      title: "Bounded Fair-Skip",
      description:
        "Eliminates queue deadlocks. If a student is momentarily unavailable, the queue serves the next person while holding a bounded fair slot for the returned student.",
      badge: "Algorithmic Fairness",
    },
    {
      icon: BellRing,
      title: "Real-Time Telemetry & Alerts",
      description:
        "Students receive automated alerts when 3 people are ahead, preventing hallway congestion and missed turns.",
      badge: "Zero-Latency",
    },
    {
      icon: BarChart3,
      title: "Staff Analytics & Insights",
      description:
        "Campus departments gain actionable metrics on wait times, service durations, peak hours, and operator efficiency.",
      badge: "Operations Intelligence",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-blue-500/20 selection:text-blue-900">
      <ApiHealthBanner />

      {/* Navigation Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo size="md" />

          <div className="flex items-center gap-3">
            <Link to="/student">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs">
                <GraduationCap className="w-4 h-4 mr-1.5 text-blue-600" />
                Student Portal
              </Button>
            </Link>
            <Link to="/staff">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs">
                <Building2 className="w-4 h-4 mr-1.5 text-indigo-600" />
                Staff Operations
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="gradient" size="sm" className="text-xs shadow-sm">
                Get Started
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Subtle Background Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-6 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Next-Gen Campus Queue Intelligence
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]"
            >
              Never lose your place. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                Never hold up the queue.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              CAMPUSFLOW transforms physical campus bottlenecks into a transparent,
              frictionless digital queue with <strong>Smart Hold</strong> and{" "}
              <strong>Bounded Fair-Skip</strong> protection.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
            >
              <Link to="/student" className="w-full sm:w-auto">
                <Button size="lg" variant="gradient" className="w-full gap-2 text-sm shadow-md">
                  <GraduationCap className="w-4 h-4" />
                  Enter Student Portal
                </Button>
              </Link>
              <Link to="/staff" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Staff Operations Desk
                </Button>
              </Link>
            </motion.div>

            {/* Quick Demo Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto"
            >
              <Card className="p-4 bg-card/60 backdrop-blur border-border/80">
                <p className="text-xs text-muted-foreground font-medium">Active Queues</p>
                <p className="text-2xl font-bold text-foreground mt-1">12</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">Across 4 Departments</p>
              </Card>
              <Card className="p-4 bg-card/60 backdrop-blur border-border/80">
                <p className="text-xs text-muted-foreground font-medium">Tokens Served</p>
                <p className="text-2xl font-bold text-foreground mt-1">842</p>
                <p className="text-[11px] text-blue-600 font-semibold mt-1">Today on campus</p>
              </Card>
              <Card className="p-4 bg-card/60 backdrop-blur border-border/80">
                <p className="text-xs text-muted-foreground font-medium">Avg. Wait Time</p>
                <p className="text-2xl font-bold text-foreground mt-1">4.2 min</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">68% reduction</p>
              </Card>
              <Card className="p-4 bg-card/60 backdrop-blur border-border/80">
                <p className="text-xs text-muted-foreground font-medium">Fairness Index</p>
                <p className="text-2xl font-bold text-foreground mt-1">99.4%</p>
                <p className="text-[11px] text-indigo-600 font-semibold mt-1">Zero dropped tokens</p>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 bg-muted/30 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Engineered for Campus Efficiency
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                Designed specifically for registrar desks, financial aid counters, advising offices, and campus events.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={idx}
                    className="p-6 transition-all hover:border-blue-500/40 hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {feature.badge}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" showTagline />
          <div className="flex items-center gap-6">
            <span>Part 1 — Project Foundation</span>
            <span>REST API + Vite + TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
