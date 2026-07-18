import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Shield,
  type LucideIcon,
} from "lucide-react";

import { BaseCard } from "@/components/ui/cards";

export type ExecutiveHealthProps = {
  systemHealth: string;
  dataQuality: number;
  attendanceRate: number;
  unreadNotifications: number;
  title?: string;
  description?: string;
  className?: string;
};

type HealthItem = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  good: boolean;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function ExecutiveHealth({
  systemHealth,
  dataQuality,
  attendanceRate,
  unreadNotifications,
  title = "صحة المدرسة الرقمية",
  description = "قراءة مختصرة لجودة البيانات والحالة التشغيلية.",
  className = "",
}: ExecutiveHealthProps) {
  const normalizedDataQuality = clampPercent(dataQuality);
  const normalizedAttendanceRate = clampPercent(attendanceRate);

  const items: HealthItem[] = [
    {
      label: "حالة النظام",
      value: systemHealth,
      icon: Shield,
      good: systemHealth === "مستقر",
    },
    {
      label: "جودة البيانات",
      value: `${normalizedDataQuality}%`,
      icon: Database,
      good: normalizedDataQuality >= 75,
    },
    {
      label: "نسبة الحضور",
      value: `${normalizedAttendanceRate}%`,
      icon: CheckCircle2,
      good: normalizedAttendanceRate >= 85,
    },
    {
      label: "التنبيهات",
      value: unreadNotifications,
      icon: AlertTriangle,
      good: unreadNotifications === 0,
    },
  ];

  return (
    <BaseCard
      as="section"
      padding="md"
      className={className}
    >
      <div className="mb-4">
        <h2 className="text-lg font-black text-[var(--app-text)]">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          {description}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className="rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--app-shadow-soft)]"
            >
              <div
                className={[
                  "mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--app-radius-lg)]",
                  item.good
                    ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                    : "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
                ].join(" ")}
              >
                <Icon
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </div>

              <p className="text-xs font-bold text-[var(--app-text-muted)]">
                {item.label}
              </p>

              <p className="mt-1 text-xl font-black text-[var(--app-text)]">
                {item.value}
              </p>
            </article>
          );
        })}
      </div>
    </BaseCard>
  );
}
