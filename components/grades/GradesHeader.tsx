"use client";

import {
  BarChart3,
  FileText,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { BaseCard } from "@/components/ui/cards";

type GradesHeaderProps = {
  schoolName?: string | null;
  activeTitle: string;
  semester?: string | null;
  academicYear?: string | null;
  studentsCount: number;
};

export default function GradesHeader({
  schoolName,
  activeTitle,
  semester,
  academicYear,
  studentsCount,
}: GradesHeaderProps) {
  return (
    <BaseCard
      as="section"
      variant="hero"
      padding="lg"
      className="overflow-hidden border-none bg-gradient-to-l from-[var(--app-primary)] via-[var(--app-primary-hover)] to-[var(--app-primary-dark)] text-[var(--app-primary-foreground)]"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--app-primary-foreground)]/20 bg-[var(--app-primary-foreground)]/10 px-3 py-1.5 text-xs font-black">
            <Sparkles
              aria-hidden="true"
              className="h-4 w-4 text-[var(--app-accent)]"
            />
            مركز التقييم الأكاديمي
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            {activeTitle}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--app-primary-foreground)]/80">
            إدارة درجات المواد والسلوك والمواظبة وفق هوية المنصة الجديدة،
            مع لوحة موحدة للرصد والتحليل وإصدار التقارير.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoCard
            icon={FileText}
            label="المدرسة"
            value={schoolName || "-"}
          />

          <InfoCard
            icon={BarChart3}
            label="الفصل الدراسي"
            value={semester || "-"}
          />

          <InfoCard
            icon={FileText}
            label="العام الدراسي"
            value={academicYear || "-"}
          />

          <InfoCard
            icon={Users}
            label="عدد الطلاب"
            value={studentsCount.toLocaleString("ar-SA")}
          />
        </div>
      </div>
    </BaseCard>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-primary-foreground)]/15 bg-[var(--app-primary-foreground)]/10 p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--app-primary-foreground)]/15">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-[var(--app-primary-foreground)]/70">
        <div className="flex h-7 w-7 items-center justify-center rounded-[var(--app-radius-md)] bg-[var(--app-primary-foreground)]/10">
          <Icon
            aria-hidden="true"
            className="h-3.5 w-3.5 text-[var(--app-accent)]"
          />
        </div>

        <span>{label}</span>
      </div>

      <div className="truncate text-base font-black text-[var(--app-primary-foreground)]">
        {value}
      </div>
    </div>
  );
}
