"use client";

import Link from "next/link";
import type { ElementType } from "react";

export type SidebarItemData = {
  label: string;
  href: string;
  icon: ElementType;
  badge?: string;
};

type SidebarItemProps = {
  item: SidebarItemData;
  active: boolean;
  expanded: boolean;
  onNavigate: () => void;
};

export default function SidebarItem({
  item,
  active,
  expanded,
  onNavigate,
}: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={!expanded ? item.label : undefined}
      className={[
        "group relative flex min-h-11 w-full items-center rounded-2xl",
        "border transition-all duration-200",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--app-accent)]",
        active
          ? [
              "border-[var(--app-accent-border)]",
              "bg-[var(--app-sidebar-active)]",
              "text-[var(--app-sidebar-text)]",
              "shadow-[var(--app-shadow-gold)]",
            ].join(" ")
          : [
              "border-transparent",
              "text-[var(--app-sidebar-muted)]",
              "hover:border-[var(--app-sidebar-border)]",
              "hover:bg-[var(--app-sidebar-hover)]",
              "hover:text-[var(--app-sidebar-text)]",
            ].join(" "),
        expanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
      ].join(" ")}
    >
      {active && (
        <span
          aria-hidden="true"
          className="
            absolute bottom-2 right-0 top-2 w-1
            rounded-l-full bg-[var(--app-accent)]
          "
        />
      )}

      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          "transition-all duration-200",
          active
            ? [
                "bg-[var(--app-accent-soft)]",
                "text-[var(--app-accent)]",
              ].join(" ")
            : [
                "bg-white/[0.04]",
                "text-[var(--app-sidebar-muted)]",
                "group-hover:bg-[var(--app-accent-soft)]",
                "group-hover:text-[var(--app-accent)]",
              ].join(" "),
        ].join(" ")}
      >
        <Icon size={17} aria-hidden="true" />
      </span>

      {expanded && (
        <>
          <span className="min-w-0 flex-1 truncate text-right text-sm font-bold">
            {item.label}
          </span>

          {item.badge && (
            <span
              className="
                shrink-0 rounded-full
                border border-[var(--app-accent-border)]
                bg-[var(--app-accent-soft)]
                px-2 py-0.5
                text-[9px] font-black
                text-[var(--app-accent)]
              "
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
