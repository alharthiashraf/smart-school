import Image from "next/image";
import { User } from "lucide-react";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export type AvatarProps = {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

const imageSizes: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function getInitials(name?: string) {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toLocaleUpperCase("ar");
}

export default function Avatar({
  name,
  src,
  size = "md",
  className,
}: AvatarProps) {
  const initials = getInitials(name);
  const accessibleName = name?.trim() || "المستخدم";

  return (
    <div
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-primary-soft)] font-black text-[var(--app-primary)] shadow-sm",
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={accessibleName}
      aria-label={accessibleName}
    >
      {src ? (
        <Image
          src={src}
          alt={accessibleName}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="h-full w-full object-cover"
          sizes={`${imageSizes[size]}px`}
        />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <User
          aria-hidden="true"
          className="h-1/2 w-1/2"
        />
      )}
    </div>
  );
}