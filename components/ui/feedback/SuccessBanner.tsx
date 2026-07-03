import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type SuccessBannerProps = {
  title?: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function SuccessBanner({
  title = "تم بنجاح",
  description,
  icon,
  action,
  className = "",
}: SuccessBannerProps) {
  return (
    <div
      className={`rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700">
            {icon || <CheckCircle2 className="h-6 w-6" />}
          </div>

          <div>
            <h3 className="font-black">{title}</h3>
            <p className="mt-1 text-sm font-bold leading-7 opacity-90">
              {description}
            </p>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}