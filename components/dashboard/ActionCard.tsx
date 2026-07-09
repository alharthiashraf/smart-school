import Link from "next/link";
import type { ElementType } from "react";

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  tone: "primary" | "gold" | "blue" | "green" | "red" | "teal";
};

type ActionCardProps = {
  action: QuickAction;
};

export default function ActionCard({ action }: ActionCardProps) {
  const Icon = action.icon;

  const tones = {
    primary: "bg-[var(--app-primary)]/10 text-[var(--app-text)]",
    gold: "bg-[#C1B489]/20 text-[var(--app-text)]",
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    red: "bg-red-50 text-red-700",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
  };

  return (
    <Link
      href={action.href}
      className="group block rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 transition hover:-translate-y-0.5 hover:bg-[var(--app-card)] hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[action.tone]}`}
        >
          <Icon size={21} />
        </div>

        <div className="min-w-0">
          <h3 className="text-base font-black text-[var(--app-text)]">
            {action.title}
          </h3>

          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--app-text-muted)]">
            {action.description}
          </p>
        </div>
      </div>
    </Link>
  );
}