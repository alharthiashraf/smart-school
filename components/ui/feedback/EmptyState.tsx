import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({
  title = "لا توجد بيانات",
  description = "لم يتم العثور على سجلات لعرضها حاليًا.",
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        {icon || <Inbox className="h-7 w-7" />}
      </div>

      <h3 className="text-lg font-black text-[#15445a]">{title}</h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
        {description}
      </p>

      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}