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
    <div className="border-t border-[var(--sidebar-border)] bg-[var(--sidebar-bg-soft)]/60 p-3">
      {expanded && schools.length > 1 && (
        <select
          value={currentSchoolId ?? ""}
          onChange={(event) => onSwitchSchool(event.target.value)}
          className="mb-3 w-full rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-soft)] px-3 py-2 text-xs font-bold text-[var(--sidebar-text)] outline-none transition focus:border-[var(--app-accent)]"
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
      )}

      <button
        type="button"
        onClick={onLogout}
        title={!expanded ? "تسجيل الخروج" : undefined}
        className={[
          "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-red-200 transition-all duration-200 hover:bg-red-500/10 hover:text-red-100",
          !expanded ? "justify-center" : "",
        ].join(" ")}
      >
        <LogOut size={20} className="shrink-0" />

        {expanded && (
          <span className="truncate text-sm font-semibold">
            تسجيل الخروج
          </span>
        )}
      </button>
    </div>
  );
}
