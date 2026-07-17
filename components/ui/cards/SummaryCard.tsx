import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import BaseCard from "./BaseCard";

type SummaryTone =
  | "primary"
  | "teal"
  | "green"
  | "blue"
  | "gold"
  | "red"
  | "slate";

type SummaryItem = {
  label: string;
  value?: string | number;
  icon?: ReactNode;
};

export type SummaryCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  items?: Array<string | SummaryItem>;
  children?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  tone?: SummaryTone;
  loading?: boolean;
  className?: string;
};

type SummaryToneClasses = {
  icon: string;
  badge: string;
  dot: string;
  itemIcon: string;
};

const toneClasses: Record<SummaryTone, SummaryToneClasses> = {
  primary: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    badge: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    dot: "bg-[var(--app-primary)]",
    itemIcon: "text-[var(--app-primary)]",
  },

  /*
   * اسم توافق قديم فقط.
   * يعرض الآن اللون الأساسي الكحلي بدل teal.
   */
  teal: {
    icon: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    badge: "bg-[var(--app-primary-soft)] text-[var(--app-primary)]",
    dot: "bg-[var(--app-primary)]",
    itemIcon: "text-[var(--app-primary)]",
  },

  green: {
    icon: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    badge: "bg-[var(--app-green-soft)] text-[var(--app-green)]",
    dot: "bg-[var(--app-green)]",
    itemIcon: "text-[var(--app-green)]",
  },

  blue: {
    icon: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    badge: "bg-[var(--app-blue-soft)] text-[var(--app-blue)]",
    dot: "bg-[var(--app-blue)]",
    itemIcon: "text-[var(--app-blue)]",
  },

  gold: {
    icon: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    badge: "bg-[var(--app-accent-soft)] text-[var(--app-accent)]",
    dot: "bg-[var(--app-accent)]",
    itemIcon: "text-[var(--app-accent)]",
  },

  red: {
    icon:
      "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    badge:
      "bg-[var(--app-destructive-soft)] text-[var(--app-destructive)]",
    dot: "bg-[var(--app-destructive)]",
    itemIcon: "text-[var(--app-destructive)]",
  },

  slate: {
    icon: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
    badge: "bg-[var(--app-card-soft)] text-[var(--app-text-muted)]",
    dot: "bg-[var(--app-text-muted)]",
    itemIcon: "text-[var(--app-text-muted)]",
  },
};

const defaultIcons: Record<SummaryTone, ReactNode> = {
  primary: <Sparkles aria-hidden="true" className="h-5 w-5" />,
  teal: <Info aria-hidden="true" className="h-5 w-5" />,
  green: <CheckCircle2 aria-hidden="true" className="h-5 w-5" />,
  blue: <Info aria-hidden="true" className="h-5 w-5" />,
  gold: <TriangleAlert aria-hidden="true" className="h-5 w-5" />,
  red: <AlertCircle aria-hidden="true" className="h-5 w-5" />,
  slate: <Info aria-hidden="true" className="h-5 w-5" />,
};

export default function SummaryCard({
  title,
  description,
  icon,
  items,
  children,
  footer,
  actions,
  tone = "primary",
  loading = false,
  className,
}: SummaryCardProps) {
  const hasItems = Boolean(items?.length);

  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
      aria-busy={loading}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              toneClasses[tone].icon,
            ].join(" ")}
            aria-hidden="true"
          >
            {icon ?? defaultIcons[tone]}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-[var(--app-text)]">
                {title}
              </h2>

              <span
                className={[
                  "rounded-full border border-current/10 px-3 py-1 text-[11px] font-black",
                  toneClasses[tone].badge,
                ].join(" ")}
              >
                ملخص
              </span>
            </div>

            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-7 text-[var(--app-text-muted)]">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions}
          </div>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-3xl bg-[var(--app-card-soft)]">
            <div
              className="flex items-center gap-3 text-sm font-bold text-[var(--app-text-muted)]"
              role="status"
            >
              <Loader2
                aria-hidden="true"
                className="h-5 w-5 animate-spin text-[var(--app-primary)]"
              />
              جاري إعداد الملخص...
            </div>
          </div>
        ) : (
          <>
            {hasItems && (
              <div className="space-y-3">
                {items?.map((item, index) => {
                  const isString = typeof item === "string";
                  const label = isString ? item : item.label;
                  const value = isString ? undefined : item.value;
                  const itemIcon = isString ? undefined : item.icon;

                  return (
                    <div
                      key={`${label}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {itemIcon ? (
                          <span
                            className={[
                              "shrink-0",
                              toneClasses[tone].itemIcon,
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {itemIcon}
                          </span>
                        ) : (
                          <span
                            className={[
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              toneClasses[tone].dot,
                            ].join(" ")}
                            aria-hidden="true"
                          />
                        )}

                        <p className="truncate text-sm font-bold text-[var(--app-text-muted)]">
                          {label}
                        </p>
                      </div>

                      {value !== undefined && (
                        <span className="shrink-0 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-1 text-xs font-black text-[var(--app-text)] shadow-sm">
                          {value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {children && (
              <div className={hasItems ? "mt-5" : ""}>
                {children}
              </div>
            )}
          </>
        )}
      </div>

      {footer && (
        <div className="mt-5 border-t border-[var(--app-border)] pt-4 text-sm leading-7 text-[var(--app-text-muted)]">
          {footer}
        </div>
      )}
    </BaseCard>
  );
}