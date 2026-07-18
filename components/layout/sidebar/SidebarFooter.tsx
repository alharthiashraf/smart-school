"use client";

import { LogOut } from "lucide-react";

type SchoolItem = {
  id: string;
  school_name: string;
};

type SidebarFooterProps = {
  expanded: boolean;
  schools: SchoolItem[];
  currentSchoolId?: string;
  onSwitchSchool: (schoolId: string) => void;
  onLogout: () => void;
};

export default function SidebarFooter({
  expanded,
  schools,
  currentSchoolId,
  onSwitchSchool,
  onLogout,
}: SidebarFooterProps) {
  return (
    <div className="border-t border-[var(--app-sidebar-border)] bg-black/5 p-3 backdrop-blur-sm">
      {expanded && schools.length > 1 && (
        <div className="mb-3">
          <label
            htmlFor="sidebar-school-switcher"
            className="mb-1.5 block px-1 text-[10px] font-black text-[var(--app-sidebar-muted)]"
          >
            المدرسة الحالية
          </label>

          <select
            id="sidebar-school-switcher"
            value={currentSchoolId ?? ""}
            onChange={(event) => onSwitchSchool(event.target.value)}
            className="
              w-full rounded-2xl
              border border-[var(--app-sidebar-border)]
              bg-[var(--app-sidebar-hover)]
              px-3 py-2.5
              text-xs font-bold
              text-[var(--app-sidebar-text)]
              outline-none
              transition-all duration-200
              focus:border-[var(--app-accent)]
              focus:ring-4
              focus:ring-[var(--app-accent-soft)]
            "
          >
            {schools.map((school) => (
              <option
                key={school.id}
                value={school.id}
                className="bg-[var(--app-card)] text-[var(--app-text)]"
              >
                {school.school_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={onLogout}
        title={!expanded ? "تسجيل الخروج" : undefined}
        aria-label="تسجيل الخروج"
        className={[
          "group flex w-full items-center gap-3 rounded-2xl",
          "border border-transparent px-3 py-2.5",
          "text-red-200",
          "transition-all duration-200",
          "hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-100",
          !expanded ? "justify-center" : "",
        ].join(" ")}
      >
        <span
          className="
            flex h-8 w-8 shrink-0 items-center justify-center
            rounded-xl
            bg-red-500/10
            text-red-200
            transition-colors duration-200
            group-hover:bg-red-500/15
            group-hover:text-red-100
          "
        >
          <LogOut size={17} />
        </span>

        {expanded && (
          <span className="truncate text-sm font-semibold">
            تسجيل الخروج
          </span>
        )}
      </button>
    </div>
  );
}
