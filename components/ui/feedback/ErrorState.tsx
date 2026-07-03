import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function ErrorState({
  title = "حدث خطأ",
  description = "تعذر تحميل البيانات. حاول مرة أخرى.",
  action,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-600">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h3 className="text-lg font-black text-rose-700">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-rose-600">
        {description}
      </p>

      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}