import type { Stage } from "@/types";

const STEPS: { key: Stage; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "preferences", label: "Preferences" },
  { key: "selection", label: "Selection" },
  { key: "workout", label: "Plan" },
];

const RUN_STEPS: { key: Stage; label: string }[] = [
  { key: "activity", label: "Activity" },
  { key: "preferences", label: "Preferences" },
  { key: "run", label: "Run Plan" },
];

interface Props {
  stage: Stage;
  activityType: "workout" | "run";
}

export default function StepIndicator({ stage, activityType }: Props) {
  const steps = activityType === "run" ? RUN_STEPS : STEPS;
  const currentIndex = steps.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center gap-0 w-full max-w-lg mx-auto mb-8">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? "bg-[#166534] text-white"
                    : active
                    ? "bg-[#166534] text-white ring-2 ring-[#166534] ring-offset-2"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium whitespace-nowrap ${
                  active ? "text-[#166534]" : done ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 -mt-4 transition-colors ${
                  done ? "bg-[#166534]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
