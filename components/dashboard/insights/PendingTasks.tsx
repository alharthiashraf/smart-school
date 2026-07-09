import { CheckCircle2, Clock } from "lucide-react";

export type PendingTask = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  status?: "pending" | "done";
};

type PendingTasksProps = {
  tasks: PendingTask[];
};

export default function PendingTasks({ tasks }: PendingTasksProps) {
  return (
    <section className="rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
      <h2 className="text-lg font-black text-[var(--app-text)]">المهام المعلقة</h2>
      <p className="mt-1 text-sm text-[var(--app-text-muted)]">
        عناصر تشغيلية تحتاج متابعة.
      </p>

      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <div className="rounded-2xl bg-[var(--app-card-soft)] p-4 text-sm font-bold text-[var(--app-text-muted)]">
            لا توجد مهام معلقة.
          </div>
        ) : (
          tasks.map((task) => {
            const Icon = task.status === "done" ? CheckCircle2 : Clock;

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3"
              >
                <Icon className="mt-0.5 h-5 w-5 text-[var(--app-teal)]" />
                <div>
                  <p className="text-sm font-black text-[var(--app-text)]">{task.title}</p>
                  {task.description && (
                    <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
