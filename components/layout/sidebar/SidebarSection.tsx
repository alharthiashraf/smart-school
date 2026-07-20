"use client";

import { ChevronDown } from "lucide-react";
import type { ElementType, ReactNode } from "react";

type SidebarSectionProps = {
  title: string;
  icon: ElementType;
  expanded: boolean;
  opened: boolean;
  count: number;
  onToggle: () => void;
  children: ReactNode;
};

export default function SidebarSection({
  title,
  icon: Icon,
  expanded,
  opened,
  count,
  onToggle,
  children,
}: SidebarSectionProps) {
  if (!expanded) {
    return (
      <div className="space-y-1.5">
        <div
          aria-hidden="true"
          className="
            mx-auto my-2 h-px w-8
            bg-gradient-to-r from-transparent via-white/15 to-transparent
          "
        />

        {children}
      </div>
    );
  }

  return (
    <section
      className="
        overflow-hidden rounded-2xl
        border border-[var(--app-sidebar-border)]
        bg-black/[0.06]
      "
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={opened}
        className={[
          "group flex w-full items-center gap-3 px-3 py-2.5 text-right",
          "transition-all duration-200",
          opened
            ? [
                "bg-[var(--app-sidebar-active)]",
                "text-[var(--app-sidebar-text)]",
              ].join(" ")
            : [
                "text-[var(--app-sidebar-muted)]",
                "hover:bg-[var(--app-sidebar-hover)]",
                "hover:text-[var(--app-sidebar-text)]",
              ].join(" "),
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            "transition-all duration-200",
            opened
              ? [
                  "bg-[var(--app-accent-soft)]",
                  "text-[var(--app-accent)]",
                ].join(" ")
              : [
                  "bg-white/[0.04]",
                  "text-[var(--app-sidebar-muted)]",
                  "group-hover:text-[var(--app-accent)]",
                ].join(" "),
          ].join(" ")}
        >
          <Icon size={16} aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1 truncate text-sm font-black">
          {title}
        </span>

        <span
          className="
            flex min-w-6 items-center justify-center rounded-full
            bg-white/[0.06] px-1.5 py-0.5
            text-[10px] font-black text-[var(--app-sidebar-muted)]
          "
        >
          {count}
        </span>

        <ChevronDown
          size={16}
          className={[
            "shrink-0 transition-transform duration-200",
            opened ? "rotate-180 text-[var(--app-accent)]" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>

      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-200",
          opened
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div
            className="
              relative space-y-1 border-r
              border-[var(--app-sidebar-border)]
              px-2 pb-2 pt-1.5
            "
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
