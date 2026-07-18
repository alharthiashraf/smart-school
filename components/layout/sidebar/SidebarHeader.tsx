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
  const displayedSchoolName = schoolName || "لم يتم تحديد مدرسة";

  return (
    <div className="border-b border-[var(--app-sidebar-border)] p-3">
      {mobileOpen && (
        <div className="mb-3 flex justify-end lg:hidden">
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
            title="إغلاق القائمة"
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl
              border border-[var(--app-sidebar-border)]
              bg-[var(--app-sidebar-hover)]
              text-[var(--app-sidebar-muted)]
              transition-all duration-200
              hover:border-[var(--app-accent-border)]
              hover:bg-[var(--app-accent-soft)]
              hover:text-[var(--app-accent)]
            "
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <div
          className="
            flex h-11 w-11 shrink-0 items-center justify-center
            rounded-2xl
            border border-[var(--app-accent-border)]
            bg-[var(--app-accent)]
            text-lg font-black
            text-[var(--app-accent-foreground)]
            shadow-[var(--app-shadow-gold)]
          "
          aria-hidden="true"
        >
          ذ
        </div>

        {expanded && (
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--app-sidebar-text)]">
              منصة المدرسة الذكية
            </p>

            <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--app-sidebar-muted)]">
              {displayedSchoolName}
            </p>
          </div>
        )}
      </div>

      {expanded && (
        <div
          className="
            mb-3 rounded-2xl
            border border-[var(--app-sidebar-border)]
            bg-[var(--app-sidebar-hover)]
            p-3
          "
        >
          <p className="truncate text-xs font-black text-[var(--app-sidebar-text)]">
            {displayedSchoolName}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge
              tone="primary"
              className="
                border border-[var(--app-accent-border)]
                bg-[var(--app-accent-soft)]
                text-[var(--app-accent)]
              "
            >
              {roleName}
            </StatusBadge>

            {semester && (
              <StatusBadge
                tone="warning"
                className="
                  border border-[var(--app-sidebar-border)]
                  bg-white/5
                  text-[var(--app-sidebar-text)]
                "
              >
                {semester}
              </StatusBadge>
            )}
          </div>
        </div>
      )}

      <div
        className={[
          "hidden items-center gap-2 lg:flex",
          expanded ? "justify-between" : "flex-col justify-center",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title={expanded ? "طي القائمة" : "توسيع القائمة"}
          aria-label={expanded ? "طي القائمة" : "توسيع القائمة"}
          aria-expanded={expanded}
          className="
            flex h-10 w-10 items-center justify-center
            rounded-xl
            border border-[var(--app-sidebar-border)]
            bg-[var(--app-sidebar-hover)]
            text-[var(--app-sidebar-muted)]
            transition-all duration-200
            hover:border-[var(--app-accent-border)]
            hover:bg-[var(--app-accent-soft)]
            hover:text-[var(--app-accent)]
          "
        >
          <ChevronRight
            size={18}
            className={[
              "transition-transform duration-200",
              expanded ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title="تبديل المظهر"
          aria-label="تبديل المظهر"
          className="
            flex h-10 w-10 items-center justify-center
            rounded-xl
            border border-[var(--app-accent-border)]
            bg-[var(--app-accent-soft)]
            text-[var(--app-accent)]
            transition-all duration-200
            hover:bg-[var(--app-accent)]
            hover:text-[var(--app-accent-foreground)]
            hover:shadow-[var(--app-shadow-gold)]
          "
        >
          <ActiveThemeIcon size={18} />
        </button>
      </div>
    </div>
  );
}
