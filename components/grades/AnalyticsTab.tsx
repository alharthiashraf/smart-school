"use client";

import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  LineChart,
  Medal,
  ShieldCheck,
  Target,
  Trophy,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

export type AnalyticsStudentRow = {
  student: {
    id: string;
    full_name: string;
    student_number?: string | null;
    classroom_name?: string | null;
  };
  percent?: number;
  score?: number;
  total?: number;
  label?: string;
  status?: string;
};

type Props = {
  subjectRows: AnalyticsStudentRow[];
  behaviorRows: AnalyticsStudentRow[];
  attendanceRows: AnalyticsStudentRow[];
};

type DistributionItem = {
  label: string;
  count: number;
  from: number;
  to: number;
  tone: "excellent" | "veryGood" | "good" | "pass" | "risk";
};

type RiskItem = {
  student: AnalyticsStudentRow["student"];
  area: "المواد" | "السلوك" | "المواظبة";
  value: number;
  severity: "high" | "medium";
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function getValue(row: AnalyticsStudentRow) {
  return clamp(toNumber(row.percent ?? row.score ?? 0));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return Math.round(sorted[mid]);
}

function passRate(rows: AnalyticsStudentRow[], passMark = 60) {
  if (!rows.length) return 0;
  const passed = rows.filter((row) => getValue(row) >= passMark).length;
  return Math.round((passed / rows.length) * 100);
}

function completionRate(rows: AnalyticsStudentRow[]) {
  if (!rows.length) return 0;
  const completed = rows.filter((row) => getValue(row) > 0).length;
  return Math.round((completed / rows.length) * 100);
}

function distribution(rows: AnalyticsStudentRow[]): DistributionItem[] {
  const values = rows.map(getValue);

  return [
    {
      label: "90 - 100",
      count: values.filter((v) => v >= 90).length,
      from: 90,
      to: 100,
      tone: "excellent",
    },
    {
      label: "80 - 89",
      count: values.filter((v) => v >= 80 && v < 90).length,
      from: 80,
      to: 89,
      tone: "veryGood",
    },
    {
      label: "70 - 79",
      count: values.filter((v) => v >= 70 && v < 80).length,
      from: 70,
      to: 79,
      tone: "good",
    },
    {
      label: "60 - 69",
      count: values.filter((v) => v >= 60 && v < 70).length,
      from: 60,
      to: 69,
      tone: "pass",
    },
    {
      label: "أقل من 60",
      count: values.filter((v) => v < 60).length,
      from: 0,
      to: 59,
      tone: "risk",
    },
  ];
}

function toneClass(tone: DistributionItem["tone"]) {
  if (tone === "excellent") return "bg-emerald-600";
  if (tone === "veryGood") return "bg-blue-600";
  if (tone === "good") return "bg-amber-500";
  if (tone === "pass") return "bg-orange-500";
  return "bg-red-600";
}

function badgeClass(value: number) {
  if (value >= 90) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (value >= 80) return "bg-blue-50 text-blue-700 ring-blue-200";
  if (value >= 70) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (value >= 60) return "bg-orange-50 text-orange-700 ring-orange-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

function topRows(rows: AnalyticsStudentRow[], limit = 10) {
  return [...rows]
    .filter((row) => getValue(row) > 0)
    .sort((a, b) => getValue(b) - getValue(a))
    .slice(0, limit);
}

function lowRows(rows: AnalyticsStudentRow[], limit = 10) {
  return [...rows]
    .filter((row) => getValue(row) > 0)
    .sort((a, b) => getValue(a) - getValue(b))
    .slice(0, limit);
}

function riskItems(
  subjectRows: AnalyticsStudentRow[],
  behaviorRows: AnalyticsStudentRow[],
  attendanceRows: AnalyticsStudentRow[]
): RiskItem[] {
  const subjectRisk: RiskItem[] = subjectRows
    .filter((row) => getValue(row) < 60)
    .map((row) => ({
      student: row.student,
      area: "المواد",
      value: getValue(row),
      severity: getValue(row) < 45 ? "high" : "medium",
    }));

  const behaviorRisk: RiskItem[] = behaviorRows
    .filter((row) => getValue(row) < 75)
    .map((row) => ({
      student: row.student,
      area: "السلوك",
      value: getValue(row),
      severity: getValue(row) < 60 ? "high" : "medium",
    }));

  const attendanceRisk: RiskItem[] = attendanceRows
    .filter((row) => getValue(row) < 75)
    .map((row) => ({
      student: row.student,
      area: "المواظبة",
      value: getValue(row),
      severity: getValue(row) < 60 ? "high" : "medium",
    }));

  return [...subjectRisk, ...behaviorRisk, ...attendanceRisk]
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
      return a.value - b.value;
    })
    .slice(0, 18);
}

function classroomSummary(rows: AnalyticsStudentRow[]) {
  const map = new Map<string, { classroom: string; values: number[]; students: number }>();

  rows.forEach((row) => {
    const classroom = row.student.classroom_name || "بدون فصل";
    const current = map.get(classroom) || { classroom, values: [], students: 0 };
    current.values.push(getValue(row));
    current.students += 1;
    map.set(classroom, current);
  });

  return Array.from(map.values())
    .map((item) => ({
      classroom: item.classroom,
      students: item.students,
      average: average(item.values),
      pass: Math.round((item.values.filter((v) => v >= 60).length / item.values.length) * 100),
    }))
    .sort((a, b) => b.average - a.average);
}

export default function AnalyticsTab({
  subjectRows,
  behaviorRows,
  attendanceRows,
}: Props) {
  const subjectValues = subjectRows.map(getValue);
  const behaviorValues = behaviorRows.map(getValue);
  const attendanceValues = attendanceRows.map(getValue);

  const subjectAverage = average(subjectValues);
  const behaviorAverage = average(behaviorValues);
  const attendanceAverage = average(attendanceValues);
  const overallAverage = average([
    subjectAverage,
    behaviorAverage,
    attendanceAverage,
  ].filter((value) => value > 0));

  const subjectPass = passRate(subjectRows, 60);
  const subjectCompletion = completionRate(subjectRows);
  const subjectMedian = median(subjectValues);
  const risks = riskItems(subjectRows, behaviorRows, attendanceRows);
  const highRisks = risks.filter((item) => item.severity === "high").length;
  const classes = classroomSummary(subjectRows);

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] p-5 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
                <LineChart className="h-4 w-4 text-[#d4af37]" />
                لوحة قيادة مركز التقييم
              </div>

              <h2 className="mt-3 text-2xl font-black">📊 التحليلات الأكاديمية</h2>

              <p className="mt-1 text-xs font-bold text-slate-200">
                قراءة شاملة لدرجات المواد والسلوك والمواظبة مع تحديد الطلاب الأكثر احتياجًا للمتابعة.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeroStat icon={Users} label="الطلاب" value={subjectRows.length || behaviorRows.length || attendanceRows.length} />
              <HeroStat icon={CheckCircle2} label="نسبة النجاح" value={`${subjectPass}%`} />
              <HeroStat icon={Target} label="اكتمال الرصد" value={`${subjectCompletion}%`} />
              <HeroStat icon={AlertTriangle} label="حالات حرجة" value={highRisks} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={BarChart3}
            title="متوسط المادة"
            value={`${subjectAverage}%`}
            subtitle={`الوسيط ${subjectMedian}%`}
            percent={subjectAverage}
          />
          <MetricCard
            icon={ShieldCheck}
            title="متوسط السلوك"
            value={`${behaviorAverage}%`}
            subtitle={`${behaviorRows.length} طالب`}
            percent={behaviorAverage}
          />
          <MetricCard
            icon={Clock3}
            title="متوسط المواظبة"
            value={`${attendanceAverage}%`}
            subtitle={`${attendanceRows.length} طالب`}
            percent={attendanceAverage}
          />
          <MetricCard
            icon={TrendingUp}
            title="المؤشر العام"
            value={`${overallAverage}%`}
            subtitle="متوسط المادة والسلوك والمواظبة"
            percent={overallAverage}
          />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DistributionCard
          title="📘 توزيع درجات المواد"
          rows={distribution(subjectRows)}
          total={subjectRows.length}
        />
        <DistributionCard
          title="🛡️ توزيع السلوك"
          rows={distribution(behaviorRows)}
          total={behaviorRows.length}
        />
        <DistributionCard
          title="🕒 توزيع المواظبة"
          rows={distribution(attendanceRows)}
          total={attendanceRows.length}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <RankingCard
          title="🏆 أفضل 10 طلاب في المادة"
          icon={Trophy}
          rows={topRows(subjectRows, 10)}
          tone="top"
        />
        <RankingCard
          title="🔻 أقل 10 طلاب في المادة"
          icon={TrendingDown}
          rows={lowRows(subjectRows, 10)}
          tone="low"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <FollowCard
          title="درجات مواد منخفضة"
          icon={BookOpen}
          rows={subjectRows
            .filter((row) => getValue(row) < 60)
            .sort((a, b) => getValue(a) - getValue(b))
            .slice(0, 8)
            .map((row) => ({
              name: row.student.full_name,
              value: `${getValue(row)}%`,
              subtitle: row.student.classroom_name || "-",
            }))}
        />

        <FollowCard
          title="سلوك منخفض"
          icon={ShieldCheck}
          rows={behaviorRows
            .filter((row) => getValue(row) < 75)
            .sort((a, b) => getValue(a) - getValue(b))
            .slice(0, 8)
            .map((row) => ({
              name: row.student.full_name,
              value: `${getValue(row)}/100`,
              subtitle: row.student.classroom_name || "-",
            }))}
        />

        <FollowCard
          title="مواظبة منخفضة"
          icon={Clock3}
          rows={attendanceRows
            .filter((row) => getValue(row) < 75)
            .sort((a, b) => getValue(a) - getValue(b))
            .slice(0, 8)
            .map((row) => ({
              name: row.student.full_name,
              value: `${getValue(row)}/100`,
              subtitle: row.student.classroom_name || "-",
            }))}
        />
      </div>

      <RiskPanel risks={risks} />

      <div className="grid gap-3 xl:grid-cols-2">
        <ClassroomCard rows={classes} />
        <TeacherSummary
          students={subjectRows.length || behaviorRows.length || attendanceRows.length}
          subjectAverage={subjectAverage}
          passRate={subjectPass}
          completion={subjectCompletion}
          risks={risks.length}
        />
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center">
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4 w-4 text-[#d4af37]" />
      </div>
      <div className="text-[10px] font-bold text-slate-300">{label}</div>
      <div className="mt-0.5 text-base font-black text-white">{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  percent,
}: {
  icon: any;
  title: string;
  value: string;
  subtitle: string;
  percent: number;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white">
        <Icon className="h-5 w-5 text-[#d4af37]" />
      </div>
      <div className="text-xs font-bold text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-bold text-slate-400">{subtitle}</div>
      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${progressClass(percent)}`}
          style={{ width: `${clamp(percent)}%` }}
        />
      </div>
    </div>
  );
}

function progressClass(percent: number) {
  if (percent >= 90) return "bg-emerald-600";
  if (percent >= 80) return "bg-blue-600";
  if (percent >= 70) return "bg-amber-500";
  if (percent >= 60) return "bg-orange-500";
  return "bg-red-600";
}

function DistributionCard({
  title,
  rows,
  total,
}: {
  title: string;
  rows: DistributionItem[];
  total: number;
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-sm font-black text-slate-900">{title}</h3>

      <div className="space-y-3">
        {rows.map((row) => {
          const width = total ? Math.round((row.count / total) * 100) : 0;

          return (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-xs font-bold">
                <span>{row.label}</span>
                <span>
                  {row.count} طالب · {width}%
                </span>
              </div>

              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${toneClass(row.tone)}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankingCard({
  title,
  icon: Icon,
  rows,
  tone,
}: {
  title: string;
  icon: any;
  rows: AnalyticsStudentRow[];
  tone: "top" | "low";
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <Icon className="h-4 w-4 text-[#d4af37]" />
        {title}
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Empty text="لا توجد بيانات." />
        ) : (
          rows.map((row, index) => {
            const value = getValue(row);

            return (
              <div
                key={`${row.student.id}-${index}`}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-black ${
                      tone === "top"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <div className="font-black text-slate-900">
                      {row.student.full_name}
                    </div>
                    <div className="mt-0.5 font-bold text-slate-400">
                      {row.student.classroom_name || "-"}
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${badgeClass(
                    value
                  )}`}
                >
                  {value}%
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FollowCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: any;
  rows: { name: string; value: string; subtitle: string }[];
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <Icon className="h-4 w-4 text-[#d4af37]" />
        {title}
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Empty text="لا توجد حالات متابعة." />
        ) : (
          rows.map((row, index) => (
            <div
              key={`${row.name}-${index}`}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 text-xs"
            >
              <div>
                <div className="font-black text-slate-900">{row.name}</div>
                <div className="mt-0.5 font-bold text-slate-400">{row.subtitle}</div>
              </div>

              <div className="font-black text-red-600">{row.value}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RiskPanel({ risks }: { risks: RiskItem[] }) {
  return (
    <div className="rounded-[1.4rem] border border-red-200 bg-red-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-red-800">
        <Flame className="h-4 w-4" />
        الطلاب الأكثر حاجة للمتابعة
      </div>

      {risks.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 text-center text-xs font-bold text-slate-500">
          لا توجد حالات متابعة حرجة حاليًا.
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {risks.map((item, index) => (
            <div
              key={`${item.student.id}-${item.area}-${index}`}
              className="rounded-2xl bg-white p-3 text-xs shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-slate-900">
                    {item.student.full_name}
                  </div>
                  <div className="mt-0.5 font-bold text-slate-400">
                    {item.student.classroom_name || "-"}
                  </div>
                </div>

                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-black ${
                    item.severity === "high"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.severity === "high" ? "حرج" : "متابعة"}
                </span>
              </div>

              <div className="mt-3 inline-flex rounded-full bg-red-100 px-2 py-1 font-black text-red-700">
                {item.area} · {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassroomCard({
  rows,
}: {
  rows: { classroom: string; students: number; average: number; pass: number }[];
}) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <Medal className="h-4 w-4 text-[#d4af37]" />
        ترتيب الفصول حسب متوسط المادة
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Empty text="لا توجد بيانات فصول." />
        ) : (
          rows.map((row, index) => (
            <div
              key={row.classroom}
              className="rounded-2xl bg-slate-50 p-3 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="font-black text-slate-900">
                  {index + 1}. {row.classroom}
                </div>
                <div className="font-black text-emerald-700">{row.average}%</div>
              </div>
              <div className="mt-1 flex justify-between font-bold text-slate-400">
                <span>{row.students} طالب</span>
                <span>نجاح {row.pass}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${progressClass(row.average)}`}
                  style={{ width: `${clamp(row.average)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TeacherSummary({
  students,
  subjectAverage,
  passRate,
  completion,
  risks,
}: {
  students: number;
  subjectAverage: number;
  passRate: number;
  completion: number;
  risks: number;
}) {
  const recommendations: string[] = [];

  if (completion < 100) recommendations.push("يوجد رصد غير مكتمل، يفضّل إكمال الدرجات قبل الاعتماد.");
  if (passRate < 70) recommendations.push("نسبة النجاح منخفضة، يفضّل تنفيذ خطة علاجية قصيرة.");
  if (subjectAverage < 70) recommendations.push("متوسط المادة يحتاج متابعة وتحليل للمكونات الأضعف.");
  if (risks > 0) recommendations.push("توجد حالات تحتاج تدخلًا مباشرًا من المعلم أو المرشد الطلابي.");
  if (recommendations.length === 0) recommendations.push("الوضع العام جيد، ويمكن الاستمرار في المتابعة الدورية.");

  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
        <Target className="h-4 w-4 text-[#d4af37]" />
        ملخص المعلم
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <MiniMetric label="الطلاب" value={students} />
        <MiniMetric label="متوسط المادة" value={`${subjectAverage}%`} />
        <MiniMetric label="نسبة النجاح" value={`${passRate}%`} />
        <MiniMetric label="اكتمال الرصد" value={`${completion}%`} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="mb-2 text-xs font-black text-slate-700">توصيات ذكية</div>
        <div className="space-y-2">
          {recommendations.map((item, index) => (
            <div key={index} className="flex gap-2 text-xs font-bold text-slate-600">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <div className="text-[10px] font-bold text-slate-400">{label}</div>
      <div className="mt-0.5 text-base font-black text-slate-900">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-500">
      {text}
    </div>
  );
}
