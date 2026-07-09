"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import PrimaryButton from "../buttons/PrimaryButton";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
};

export default function EmptyState({
  title = "لا توجد بيانات",
  description = "لم يتم العثور على أي بيانات لعرضها.",
  icon,
  action,
  actionText,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-8 py-12 text-center shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="h-10 w-10" />}
      </div>

      <h3 className="mt-6 text-xl font-black text-[#15445A]">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
        {description}
      </p>

      {action}

      {!action && actionText && onAction && (
        <div className="mt-6">
          <PrimaryButton onClick={onAction}>
            {actionText}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}