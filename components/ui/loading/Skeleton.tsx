export type SkeletonProps = {
  className?: string;
};

export default function Skeleton({
  className,
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "animate-pulse rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
