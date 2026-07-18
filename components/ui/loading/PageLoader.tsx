import { Loader2 } from "lucide-react";

export type PageLoaderProps = {
  text?: string;
  className?: string;
};

export default function PageLoader({
  text = "جاري التحميل...",
  className,
}: PageLoaderProps) {
  return (
    <div
      className={[
        "flex min-h-[360px] flex-col items-center justify-center rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-8 text-center shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        aria-hidden="true"
        className="h-9 w-9 animate-spin text-[var(--app-primary)]"
      />

      <p className="mt-4 text-sm font-black text-[var(--app-text-muted)]">
        {text}
      </p>
    </div>
  );
}
