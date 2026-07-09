import { User } from "lucide-react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

type AvatarProps = {
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

function getInitials(name?: string) {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = "md",
  className = "",
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-emerald-50 font-black text-emerald-700 shadow-sm ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name || "Avatar"}
          className="h-full w-full object-cover"
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <User className="h-1/2 w-1/2" />
      )}
    </div>
  );
}