"use client";

import type { ElementType } from "react";
import { ChevronRight, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";

type SidebarHeaderProps = {
  expanded: boolean;
  mobileOpen: boolean;
  schoolName?: string;
  roleName: string;
  semester?: string;
  ActiveThemeIcon: ElementType;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
  onCloseMobile: () => void;
};

export default function SidebarHeader({
  expanded,
  mobileOpen,
  schoolName,
  roleName,
  semester,
  ActiveThemeIcon,
  onToggleCollapse,
  onToggleTheme,
  onCloseMobile,
}: SidebarHeaderProps) {
  return (
    <div className="border-b border-[var(--sidebar-border)] p-3">
      {mobileOpen && (
        <div className="mb-3 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-soft)] text-[var(--sidebar-muted)] transition hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
            aria-label="إغلاق القائمة"
            title="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-accent)] text-lg font-black text-slate-950 shadow-lg shadow-black/10">
          ذ
        </div>

        {expanded && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--sidebar-text)]">
              منصة المدرسة الذكية
            </p>

            <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--sidebar-muted)]">
              {schoolName || "لم يتم تحديد مدرسة"}
            </p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mb-3 rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-soft)] p-3">
          <p className="truncate text-xs font-black text-[var(--sidebar-text)]">
            {schoolName || "لم يتم تحديد مدرسة"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge tone="success">{roleName}</StatusBadge>

            {semester && <StatusBadge tone="warning">{semester}</StatusBadge>}
          </div>
        </div>
      )}

      <div className="hidden items-center justify-between gap-2 lg:flex">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-soft)] text-[var(--sidebar-muted)] transition hover:border-[var(--app-accent)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)]"
          title={expanded ? "طي القائمة" : "توسيع القائمة"}
          aria-label={expanded ? "طي القائمة" : "توسيع القائمة"}
        >
          <ChevronRight
            size={18}
            className={`transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-soft)] text-[var(--app-accent)] transition hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)] hover:text-slate-950"
          title="تبديل المظهر"
          aria-label="تبديل المظهر"
        >
          <ActiveThemeIcon size={18} />
        </button>
      </div>
    </div>
  );
}
