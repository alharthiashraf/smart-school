"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RefreshCcw, Search, Shield, Sparkles } from "lucide-react";

type ExecutiveHeroProps = {
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
}: ExecutiveHeroProps) {
  const stable = systemHealth === "مستقر";

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm">
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[var(--app-teal-soft)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-[var(--app-accent-soft)] blur-3xl" />

      <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-teal)]">
            <Sparkles className="h-4 w-4" />
            مركز القيادة التنفيذي
          </div>

          <h1 className="text-2xl font-black leading-tight sm:text-4xl">
            أهلًا، {userName}
          </h1>

          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[var(--app-text-muted)]">
            لوحة قيادة يومية تعرض حالة المدرسة، جودة البيانات، مؤشرات الحضور والتنبيهات، مع إجراءات تشغيلية سريعة حسب صلاحية المستخدم.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--app-card-soft)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
              {schoolName}
            </span>
            <span className="rounded-full bg-[var(--app-teal-soft)] px-3 py-1 text-xs font-black text-[var(--app-teal)]">
              {roleName}
            </span>
            <span className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
              {academicYear || "العام الدراسي"} · {semester || "الفصل الدراسي"}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-black text-[var(--app-text)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-card-soft)] hover:shadow-md"
              >
                <RefreshCcw className="h-4 w-4" />
                تحديث
              </button>
            )}

            <Link
              href="/search"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--app-teal)] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--app-teal-hover)] hover:shadow-md"
            >
              <Search className="h-4 w-4" />
              البحث الشامل
            </Link>

            {actions}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={[
                "flex h-12 w-12 items-center justify-center rounded-2xl",
                stable
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
              ].join(" ")}
            >
              <Shield className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--app-text-muted)]">
                حالة النظام
              </p>
              <p className="mt-1 text-lg font-black">{systemHealth}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <InfoRow label="اليوم" value={today} />
            <InfoRow label="آخر مزامنة" value={lastSync || "غير محدد"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--app-card)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--app-text-muted)]">{label}</span>
      <span className="text-xs font-black text-[var(--app-text)]">{value}</span>
    </div>
  );
}
