import type { ReactNode } from "react";

export type ContainerSize = "default" | "wide" | "full";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  size?: ContainerSize;
  centered?: boolean;
};

const SIZE_CLASSES: Record<ContainerSize, string> = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageContainer({
  children,
  className,
  size = "wide",
  centered = true,
}: PageContainerProps) {
  return (
    <main
      className={cx(
        "relative w-full",
        "text-[var(--app-text)]",
        "transition-colors duration-300",
        SIZE_CLASSES[size],
        centered && "mx-auto",
        className,
      )}
    >
      {children}
    </main>
  );
}
