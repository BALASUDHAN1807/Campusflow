import React from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils";

const variantStyles = {
  default: "border-border text-foreground",
  primary:
    "border-blue-200/70 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 text-blue-900 dark:from-blue-950/20 dark:to-indigo-950/10 dark:text-blue-100 dark:border-blue-900/50",
  success:
    "border-emerald-200/70 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 text-emerald-900 dark:from-emerald-950/20 dark:to-teal-950/10 dark:text-emerald-100 dark:border-emerald-900/50",
  warning:
    "border-amber-200/70 bg-gradient-to-br from-amber-50/50 to-orange-50/30 text-amber-900 dark:from-amber-950/20 dark:to-orange-950/10 dark:text-amber-100 dark:border-amber-900/50",
  purple:
    "border-purple-200/70 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 text-purple-900 dark:from-purple-950/20 dark:to-fuchsia-950/10 dark:text-purple-100 dark:border-purple-900/50",
};

export function StatCard({ title, value, subtitle, icon, trend, variant = "default", className }) {
  return (
    <Card
      className={cn(
        "p-5 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="flex items-center text-xs font-medium pt-1">
              <span className={cn("mr-1", trend.isPositive ? "text-emerald-600" : "text-amber-600")}>
                {trend.value}
              </span>
              <span className="text-muted-foreground">vs last hour</span>
            </div>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-background/80 shadow-sm border border-border/50 text-foreground">
          {icon}
        </div>
      </div>
    </Card>
  );
}
