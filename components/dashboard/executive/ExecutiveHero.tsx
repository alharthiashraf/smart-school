"use client";

import type { ReactNode } from "react";
import {
  Loader2,
  RefreshCcw,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import { SecondaryButton } from "@/components/ui/buttons";
import { BaseCard } from "@/components/ui/cards";
import { ToolbarButtonLink } from "@/components/ui/page";

export type ExecutiveHeroProps = {
  userName: string;
  schoolName: string;
  roleName: string;
  academicYear?: string | null;
  semester?: string | null;
  today: string;
  systemHealth: string;
  lastSync?: string | null;
  actions?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  searchHref?: string;
  searchDisabled?: boolean;
  title?: string;
  description?: string;
  className?: string;
};

export default function ExecutiveHero({
  userName,
  schoolName,
  roleName,
  academicYear,
  semester,
  today,
  systemHealth,
  lastSync,
  actions,
  onRefresh,
  refreshing = false,
  searchHref = "/search",
  searchDisabled = false,
  title = "مركز القيادة التنفيذي",
  description = "لوحة قيادة يومية تعرض حالة المدرسة، جودة البيانات، مؤشرات الحضور والتنبيهات، مع إجراءات تشغيلية سريعة حسب صلاحية المستخدم.",
  className = "",
}: ExecutiveHeroProps) {
  const normalizedSystemHealth = systemHealth.trim();
  const stable = normalizedSystemHealth === "مستقر";

  return (
    <BaseCard
      as="section"
      variant="elevated"
      padding="none"
      className={[
        "relative overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="executive-hero-title"
    >
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[var(--app-primary-soft)] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-[var(--app-accent-soft)] blur-3xl" />

      <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="min-w-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-1.5 text-xs font-black text-[var(--app-primary)]">
            <Sparkles
              aria-hidden="true"
              className="h-4 w-4 text-[var(--app-accent)]"
            />

            {title}
          </div>

          <h1
            id="executive-hero-title"
            className="text-2xl font-black leading-tight text-[var(--app-text)] sm:text-4xl"
          >
            أهلًا، {userName}
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[var(--app-text-muted)]">
            {description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <StatusBadge tone="default">
              {schoolName}
            </StatusBadge>

            <StatusBadge tone="primary">
              {roleName}
            </StatusBadge>

            <StatusBadge tone="warning">
              {academicYear || "العام الدراسي"} ·{" "}
              {semester || "الفصل الدراسي"}
            </StatusBadge>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {onRefresh && (
              <SecondaryButton
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-busy={refreshing}
                icon={
                  refreshing ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <RefreshCcw
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  )
                }
              >
                {refreshing ? "جاري التحديث..." : "تحديث"}
              </SecondaryButton>
            )}

            <ToolbarButtonLink
              href={searchHref}
              variant="primary"
              disabled={searchDisabled}
            >
              <Search
                aria-hidden="true"
                className="h-4 w-4"
              />

              البحث الشامل
            </ToolbarButtonLink>

            {actions}
          </div>
        </div>

        <BaseCard
          as="aside"
          variant="soft"
          padding="sm"
          className="self-stretch"
          aria-label="ملخص حالة النظام"
        >
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)]",
                stable
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
              ].join(" ")}
            >
              <Shield
                aria-hidden="true"
                className="h-6 w-6"
              />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--app-text-muted)]">
                حالة النظام
              </p>

              <p className="mt-1 truncate text-lg font-black text-[var(--app-text)]">
                {normalizedSystemHealth || "غير محدد"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <InfoRow
              label="اليوم"
              value={today}
            />

            <InfoRow
              label="آخر مزامنة"
              value={lastSync || "غير محدد"}
            />
          </div>
        </BaseCard>
      </div>
    </BaseCard>
  );
}

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2">
      <span className="shrink-0 text-xs font-bold text-[var(--app-text-muted)]">
        {label}
      </span>

      <span className="min-w-0 truncate text-xs font-black text-[var(--app-text)]">
        {value}
      </span>
    </div>
  );
}