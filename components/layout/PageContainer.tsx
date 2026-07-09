import type { ReactNode } from "react";

type ContainerSize = "default" | "wide" | "full";

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

export default function PageContainer({
  children,
  className = "",
  size = "wide",
  centered = true,
}: PageContainerProps) {
  return (
    <div
      className={[
        "w-full text-[var(--app-text)]",
        SIZE_CLASSES[size],
        centered ? "mx-auto" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
