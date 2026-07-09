import Link from "next/link";
import type { ElementType } from "react";
import { Pin, PinOff } from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";

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
  favorite: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  onToggleFavorite: (href: string) => void;
};

export default function SidebarItem({
  item,
  active,
  expanded,
  favorite,
  compact = false,
  onNavigate,
  onToggleFavorite,
}: SidebarItemProps) {
  const Icon = item.icon;

  return (
    <div className="group/item relative flex items-center gap-1">
      {active && expanded && (
        <span className="absolute -right-2 top-1/2 h-8 w-1 -translate-y-1/2 rounded-l-full bg-[var(--app-accent)] shadow-[0_0_18px_rgba(193,180,137,0.45)]" />
      )}

      <Link
        href={item.href}
        onClick={onNavigate}
        title={!expanded ? item.label : undefined}
        className={[
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl transition-all duration-200 ease-out",
          expanded ? "px-2.5 py-2" : "justify-center px-2 py-2.5",
          active
            ? "bg-[var(--app-accent)] text-slate-950 shadow-lg shadow-black/10"
            : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-bg-soft)] hover:text-[var(--sidebar-text)]",
          compact ? "py-2" : "",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            active
              ? "bg-black/10 text-slate-950"
              : "bg-[var(--sidebar-bg-soft)] text-current group-hover/item:bg-[var(--app-accent-soft)] group-hover/item:text-[var(--app-accent)]",
          ].join(" ")}
        >
          <Icon size={18} className="shrink-0" />
        </span>

        {expanded && (
          <span className="truncate text-[13px] font-bold leading-5">
            {item.label}
          </span>
        )}

        {expanded && item.badge && (
          <span className="mr-auto">
            <StatusBadge tone="primary" className="px-2 py-0.5 text-[10px]">
              {item.badge}
            </StatusBadge>
          </span>
        )}
      </Link>

      {expanded && (
        <button
          type="button"
          onClick={() => onToggleFavorite(item.href)}
          className={[
            "hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 group-hover/item:flex",
            favorite
              ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
              : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-bg-soft)] hover:text-[var(--sidebar-text)]",
          ].join(" ")}
          title={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        >
          {favorite ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
      )}
    </div>
  );
}
