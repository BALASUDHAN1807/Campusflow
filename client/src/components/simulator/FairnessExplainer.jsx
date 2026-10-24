import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, ArrowRight } from "lucide-react";

export const FairnessExplainer = () => {
  const steps = [
    {
      num: 1,
      title: "Student Declares Smart Hold",
      description: "A student temporarily steps away and declares a time-bounded Smart Hold.",
    },
    {
      num: 2,
      title: "Staff Calls Next",
      description: "The desk becomes available and staff requests the next waiting student.",
    },
    {
      num: 3,
      title: "Bounded Skip Evaluated",
      description: "If hold is active, token is temporarily skipped and stepped back exactly 1 position.",
    },
    {
      num: 4,
      title: "Fairness Limit (MAX_SKIPS)",
      description: "After the configured limit (e.g. 3 skips), the token is moved to the queue tail.",
    },
    {
      num: 5,
      title: "Resumed Service",
      description: "Students who return are served immediately when reaching the front again.",
    },
  ];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          How Bounded Fair-Skip Works
        </CardTitle>
        <CardDescription className="text-xs">
          Core innovation: Zero queue blocking without unfairly dropping students.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {steps.map((step, idx) => (
            <div
              key={step.num}
              className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col justify-between gap-2 relative"
            >
              <div>
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mb-1.5">
                  {step.num}
                </div>
                <div className="text-xs font-bold text-foreground leading-snug">{step.title}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {step.description}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
