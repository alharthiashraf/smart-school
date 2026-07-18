import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import { BaseCard } from "@/components/ui/cards";
import { EmptyState } from "@/components/ui/empty-state";

export type PendingTask = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  status?: "pending" | "done";
};

export type PendingTasksProps = {
  tasks: PendingTask[];
  title?: string;
  description?: string;
  className?: string;
};

export default function PendingTasks({
  tasks,
  title = "المهام المعلقة",
  description = "عناصر تشغيلية تحتاج متابعة.",
  className = "",
}: PendingTasksProps) {
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

      {tasks.length === 0 ? (
        <EmptyState
          title="لا توجد مهام معلقة"
          description="تمت معالجة جميع المهام المتاحة حاليًا."
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
            />
          ))}
        </div>
      )}
    </BaseCard>
  );
}

function TaskItem({
  task,
}: {
  task: PendingTask;
}) {
  const done = task.status === "done";
  const Icon = done ? CheckCircle2 : Clock3;

  const content = (
    <>
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--app-radius-lg)]",
          done
            ? "bg-[var(--app-green-soft)] text-[var(--app-green)]"
            : "bg-[var(--app-warning-soft)] text-[var(--app-warning)]",
        ].join(" ")}
      >
        <Icon
          aria-hidden="true"
          className="h-5 w-5"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-[var(--app-text)]">
            {task.title}
          </h3>

          <StatusBadge
            tone={done ? "success" : "warning"}
          >
            {done ? "مكتملة" : "معلقة"}
          </StatusBadge>
        </div>

        {task.description && (
          <p className="mt-1 text-xs leading-6 text-[var(--app-text-muted)]">
            {task.description}
          </p>
        )}
      </div>
    </>
  );

  const className = [
    "flex items-start gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-3 transition",
    task.href
      ? "hover:-translate-y-0.5 hover:border-[var(--app-accent)] hover:shadow-[var(--app-shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (task.href) {
    return (
      <Link
        href={task.href}
        className={className}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className={className}>
      {content}
    </article>
  );
}
