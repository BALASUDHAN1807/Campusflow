import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandLogo({ showTagline = false, className, size = "md" }) {
  const sizeClasses = {
    sm: "h-7 w-7 text-sm",
    md: "h-9 w-9 text-base",
    lg: "h-11 w-11 text-xl",
  };

  const titleClasses = {
    sm: "text-base font-bold",
    md: "text-lg font-extrabold tracking-tight",
    lg: "text-2xl font-black tracking-tight",
  };

  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5 group", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-md transition-transform duration-200 group-hover:scale-105",
          sizeClasses[size]
        )}
      >
        <Layers className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-foreground", titleClasses[size])}>
            CAMPUS<span className="text-blue-600">FLOW</span>
          </span>
          <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            v1.0
          </span>
        </div>
        {showTagline && (
          <span className="text-xs text-muted-foreground font-medium">
            Never lose your place. Never hold up the queue.
          </span>
        )}
      </div>
    </Link>
  );
}
