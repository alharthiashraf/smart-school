"use client";

import {
  PanelRightClose,
  PanelRightOpen,
  School,
  X,
} from "lucide-react";

type SidebarHeaderProps = {
  expanded: boolean;
  mobileOpen: boolean;
  schoolName?: string;
  roleName: string;
  semester?: string;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

export default function SidebarHeader({
  expanded,
  mobileOpen,
  schoolName,
  roleName,
  semester,
  onToggleCollapse,
  onCloseMobile,
}: SidebarHeaderProps) {
  return (
    <header
      className={[
        "relative z-10 shrink-0",
        "border-b border-[var(--app-sidebar-border)]",
        expanded ? "px-3 pb-3 pt-4" : "px-2 pb-3 pt-4",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center",
          expanded ? "justify-between gap-3" : "justify-center",
        ].join(" ")}
      >
        <div
          className={[
            "flex min-w-0 items-center",
            expanded ? "gap-3" : "",
          ].join(" ")}
        >
          <div
            className="
              flex h-11 w-11 shrink-0 items-center justify-center
              rounded-2xl
              border border-[var(--app-accent-border)]
              bg-[var(--app-accent-soft)]
              text-[var(--app-accent)]
              shadow-[var(--app-shadow-gold)]
            "
          >
            <School size={21} aria-hidden="true" />
          </div>

          {expanded && (
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[var(--app-sidebar-text)]">
                منصة المدرسة الذكية
              </p>

              <p className="mt-0.5 truncate text-[11px] font-bold text-[var(--app-sidebar-muted)]">
                {schoolName || "لم تُحدد المدرسة"}
              </p>
            </div>
          )}
        </div>

        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="إغلاق القائمة"
            className="
              flex h-9 w-9 items-center justify-center rounded-xl
              border border-[var(--app-sidebar-border)]
              bg-[var(--app-sidebar-hover)]
              text-[var(--app-sidebar-muted)]
              transition-all duration-200
              hover:border-[var(--app-accent-border)]
              hover:bg-[var(--app-sidebar-active)]
              hover:text-[var(--app-accent)]
              lg:hidden
            "
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      {expanded && (
        <div
          className="
            mt-3 flex items-center justify-between gap-2
            rounded-2xl
            border border-[var(--app-sidebar-border)]
            bg-[var(--app-sidebar-hover)]
            px-3 py-2.5
          "
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-[var(--app-sidebar-text)]">
              {roleName}
            </p>

            {semester && (
              <p className="mt-0.5 truncate text-[10px] font-bold text-[var(--app-sidebar-muted)]">
                {semester}
              </p>
            )}
          </div>

          <span
            className="
              h-2 w-2 shrink-0 rounded-full
              bg-[var(--app-accent)]
              shadow-[0_0_14px_var(--app-accent)]
            "
            aria-hidden="true"
          />
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={expanded ? "طي القائمة الجانبية" : "توسيع القائمة الجانبية"}
        title={expanded ? "طي القائمة" : "توسيع القائمة"}
        className={[
          "mt-3 hidden w-full items-center rounded-xl",
          "border border-[var(--app-sidebar-border)]",
          "bg-[var(--app-sidebar-hover)]",
          "text-[var(--app-sidebar-muted)]",
          "transition-all duration-200",
          "hover:border-[var(--app-accent-border)]",
          "hover:bg-[var(--app-sidebar-active)]",
          "hover:text-[var(--app-accent)]",
          "lg:flex",
          expanded ? "justify-between px-3 py-2" : "justify-center p-2",
        ].join(" ")}
      >
        {expanded && <span className="text-xs font-bold">طي القائمة</span>}

        {expanded ? (
          <PanelRightClose size={17} aria-hidden="true" />
        ) : (
          <PanelRightOpen size={17} aria-hidden="true" />
        )}
      </button>
    </header>
  );
}
