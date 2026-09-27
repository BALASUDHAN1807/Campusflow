import { Link } from "react-router-dom";
import { Layers, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
      <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-600 mb-4">
        <Layers className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-foreground tracking-tight">404</h1>
      <h2 className="text-lg font-semibold text-foreground mt-2">Page Not Found</h2>
      <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
        The route you are looking for does not exist in the CampusFlow portal.
      </p>
      <Link to="/">
        <Button variant="default" size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Return to Home
        </Button>
      </Link>
    </div>
  );
}
