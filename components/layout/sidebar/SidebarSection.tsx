import { ChevronDown } from "lucide-react";
import type { ElementType, ReactNode } from "react";

type SidebarSectionProps = {
  title: string;
  icon: ElementType;
  expanded: boolean;
  opened: boolean;
  count?: number;
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
      <div
        className="
          mx-auto my-2 h-px w-8
          bg-gradient-to-l
          from-transparent
          via-[var(--app-sidebar-border)]
          to-transparent
        "
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={opened}
        className={[
          "group flex w-full items-center justify-between gap-2",
          "rounded-2xl px-3 py-2.5",
          "text-[11px] font-black",
          "transition-all duration-200",
          opened
            ? "bg-[var(--app-sidebar-active)] text-[var(--app-accent)]"
            : "text-[var(--app-sidebar-muted)] hover:bg-[var(--app-sidebar-hover)] hover:text-[var(--app-sidebar-text)]",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={[
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
              "border transition-colors duration-200",
              opened
                ? "border-[var(--app-accent-border)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                : "border-[var(--app-sidebar-border)] bg-white/5 text-[var(--app-sidebar-muted)] group-hover:text-[var(--app-sidebar-text)]",
            ].join(" ")}
          >
            <Icon size={14} />
          </span>

          <span className="truncate">{title}</span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {typeof count === "number" && (
            <span
              className={[
                "min-w-6 rounded-full px-2 py-0.5 text-center text-[10px]",
                opened
                  ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                  : "bg-white/5 text-[var(--app-sidebar-muted)]",
              ].join(" ")}
            >
              {count}
            </span>
          )}

          <ChevronDown
            size={14}
            className={[
              "transition-transform duration-200",
              opened ? "rotate-180 text-[var(--app-accent)]" : "",
            ].join(" ")}
          />
        </span>
      </button>

      {opened && (
        <div className="space-y-1 border-r border-[var(--app-sidebar-border)] pr-2">
          {children}
        </div>
      )}
    </div>
  );
}