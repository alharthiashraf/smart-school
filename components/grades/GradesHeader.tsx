"use client";

import { BarChart3, FileText, Sparkles, Users } from "lucide-react";

type Props = {
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
}: Props) {
  return (
    <section className="rounded-[1.4rem] bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] p-4 text-white shadow-lg">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold">
            <Sparkles className="h-4 w-4 text-[#d4af37]" />
            مركز التقييم الأكاديمي
          </div>

          <h1 className="text-2xl font-black">{activeTitle}</h1>

          <p className="mt-1 text-xs text-slate-200">
            {schoolName || "المدرسة"} — السلوك والمواظبة مستقلان تمامًا عن المواد.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <Info icon={FileText} label="المدرسة" value={schoolName || "-"} />
          <Info icon={BarChart3} label="الفصل الدراسي" value={semester || "-"} />
          <Info icon={FileText} label="السنة" value={academicYear || "-"} />
          <Info icon={Users} label="الطلاب" value={`${studentsCount}`} />
        </div>
      </div>
    </section>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-300">
        <Icon className="h-3 w-3 text-[#d4af37]" />
        {label}
      </div>
      <div className="truncate text-sm font-black">{value}</div>
    </div>
  );
}