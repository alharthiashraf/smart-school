import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, Sparkles, TriangleAlert } from "lucide-react";

type SummaryTone = "primary" | "teal" | "green" | "blue" | "gold" | "red" | "slate";

type SummaryItem = {
  label: string;
  value?: string | number;
  icon?: ReactNode;
};

type SummaryCardProps = {
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

const toneClasses: Record<SummaryTone, { icon: string; badge: string; dot: string }> = {
  primary: {
    icon: "bg-[#15445A]/10 text-[#15445A]",
    badge: "bg-[#15445A]/10 text-[#15445A]",
    dot: "bg-[#15445A]",
  },
  teal: {
    icon: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    badge: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    dot: "bg-[#0DA9A6]",
  },
  green: {
    icon: "bg-[#07A869]/10 text-[#07A869]",
    badge: "bg-[#07A869]/10 text-[#07A869]",
    dot: "bg-[#07A869]",
  },
  blue: {
    icon: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    badge: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    dot: "bg-[#3D7EB9]",
  },
  gold: {
    icon: "bg-[#C1B489]/20 text-[#15445A]",
    badge: "bg-[#C1B489]/20 text-[#15445A]",
    dot: "bg-[#C1B489]",
  },
  red: {
    icon: "bg-red-50 text-red-700",
    badge: "bg-red-50 text-red-700",
    dot: "bg-red-600",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
};

const defaultIcons: Record<SummaryTone, ReactNode> = {
  primary: <Sparkles className="h-5 w-5" />,
  teal: <Info className="h-5 w-5" />,
  green: <CheckCircle2 className="h-5 w-5" />,
  blue: <Info className="h-5 w-5" />,
  gold: <TriangleAlert className="h-5 w-5" />,
  red: <AlertCircle className="h-5 w-5" />,
  slate: <Info className="h-5 w-5" />,
};

export default function SummaryCard({
  title,
  description,
  icon,
  items,
  children,
  footer,
  actions,
  tone = "teal",
  loading = false,
  className = "",
}: SummaryCardProps) {
  return (
    <section
      dir="rtl"
      className={[
        "rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={[
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              toneClasses[tone].icon,
            ].join(" ")}
          >
            {icon || defaultIcons[tone]}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-[#15445A]">{title}</h2>

              <span
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-black",
                  toneClasses[tone].badge,
                ].join(" ")}
              >
                ملخص
              </span>
            </div>

            {description && (
              <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-3xl bg-slate-50">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#0DA9A6]" />
              جاري إعداد الملخص...
            </div>
          </div>
        ) : (
          <>
            {items && items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const isString = typeof item === "string";
                  const label = isString ? item : item.label;
                  const value = isString ? undefined : item.value;

                  return (
                    <div
                      key={`${label}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isString || !item.icon ? (
                          <span
                            className={[
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              toneClasses[tone].dot,
                            ].join(" ")}
                          />
                        ) : (
                          <span className="shrink-0 text-[#0DA9A6]">{item.icon}</span>
                        )}

                        <p className="truncate text-sm font-bold text-slate-600">
                          {label}
                        </p>
                      </div>

                      {value !== undefined && (
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#15445A] shadow-sm">
                          {value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {children && <div className={items && items.length > 0 ? "mt-5" : ""}>{children}</div>}
          </>
        )}
      </div>

      {footer && (
        <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-500">
          {footer}
        </div>
      )}
    </section>
  );
}
