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
  return (
    <div className="space-y-1">
      {expanded ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-2 rounded-2xl px-2.5 py-2 text-[11px] font-black text-[var(--sidebar-muted)] transition-all duration-200 hover:bg-[var(--app-primary-soft)] hover:text-[var(--app-primary)]"
        >
          <span className="flex items-center gap-2">
            <Icon size={14} />
            {title}
          </span>

          <span className="flex items-center gap-2">
            {typeof count === "number" && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {count}
              </span>
            )}

            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                opened ? "rotate-180" : ""
              }`}
            />
          </span>
        </button>
      ) : (
        <div className="mx-auto mb-2 h-px w-8 bg-gradient-to-l from-transparent via-white/20 to-transparent" />
      )}

      {opened && (
        <div className="space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}