import { CheckCircle2, AlertTriangle, Database, Shield } from "lucide-react";

type ExecutiveHealthProps = {
  systemHealth: string;
  dataQuality: number;
  attendanceRate: number;
  unreadNotifications: number;
};

export default function ExecutiveHealth({
  systemHealth,
  dataQuality,
  attendanceRate,
  unreadNotifications,
}: ExecutiveHealthProps) {
  const items = [
    {
      label: "حالة النظام",
      value: systemHealth,
      icon: <Shield className="h-5 w-5" />,
      good: systemHealth === "مستقر",
    },
    {
      label: "جودة البيانات",
      value: `${dataQuality}%`,
      icon: <Database className="h-5 w-5" />,
      good: dataQuality >= 75,
    },
    {
      label: "نسبة الحضور",
      value: `${attendanceRate}%`,
      icon: <CheckCircle2 className="h-5 w-5" />,
      good: attendanceRate >= 85,
    },
    {
      label: "التنبيهات",
      value: unreadNotifications,
      icon: <AlertTriangle className="h-5 w-5" />,
      good: unreadNotifications === 0,
    },
  ];

  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 text-[var(--app-text)] shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black">صحة المدرسة الرقمية</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
          قراءة مختصرة لجودة البيانات والحالة التشغيلية.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-4"
          >
            <div
              className={[
                "mb-3 flex h-10 w-10 items-center justify-center rounded-2xl",
                item.good
                  ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
                  : "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
              ].join(" ")}
            >
              {item.icon}
            </div>
            <p className="text-xs font-bold text-[var(--app-text-muted)]">
              {item.label}
            </p>
            <p className="mt-1 text-xl font-black text-[var(--app-text)]">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
