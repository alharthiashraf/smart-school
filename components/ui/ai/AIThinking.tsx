import { BrainCircuit, Loader2 } from "lucide-react";

export type AIThinkingProps = {
  text?: string;
  className?: string;
};

export default function AIThinking({
  text = "يقوم الذكاء الاصطناعي بتحليل البيانات...",
  className,
}: AIThinkingProps) {
  return (
    <div
      className={[
        "flex min-h-[220px] flex-col items-center justify-center rounded-[var(--app-radius-xl)] border border-dashed border-[var(--app-border)] bg-[var(--app-card)] px-6 py-10 text-center shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]"
        aria-hidden="true"
      >
        <BrainCircuit className="h-8 w-8 animate-pulse" />

        <Loader2 className="absolute -bottom-1 -left-1 h-5 w-5 animate-spin rounded-full bg-[var(--app-card)] p-0.5 text-[var(--app-accent)]" />
      </div>

      <p className="mt-5 max-w-md text-sm font-black leading-7 text-[var(--app-text-muted)]">
        {text}
      </p>
    </div>
  );
}
