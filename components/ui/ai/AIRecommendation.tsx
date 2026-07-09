import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

type AIRecommendationProps = {
  title?: string;
  recommendation: string;
  action?: ReactNode;
};

export default function AIRecommendation({
  title = "توصية ذكية",
  recommendation,
  action,
}: AIRecommendationProps) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-700">
          <Lightbulb className="h-5 w-5" />
        </div>

        <h3 className="font-black text-amber-900">
          {title}
        </h3>
      </div>

      <p className="mt-4 text-sm leading-7 text-amber-800">
        {recommendation}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}