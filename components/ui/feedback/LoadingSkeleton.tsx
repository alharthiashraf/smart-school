export type LoadingSkeletonProps = {
  variant?: "page" | "table" | "cards";
};

export default function LoadingSkeleton({
  variant = "page",
}: LoadingSkeletonProps) {
  if (variant === "cards") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm"
          >
            <div className="h-4 w-24 animate-pulse rounded-lg bg-[var(--app-card-soft)]" />

            <div className="mt-3 h-7 w-16 animate-pulse rounded-lg bg-[var(--app-border)]" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-2xl bg-[var(--app-card-soft)]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded-xl bg-[var(--app-border)]" />

        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-xl bg-[var(--app-card-soft)]" />
      </div>

      <LoadingSkeleton variant="cards" />

      <LoadingSkeleton variant="table" />
    </div>
  );
}