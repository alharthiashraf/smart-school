"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

type HeaderNotificationsProps = {
  count: number;
};

export default function HeaderNotifications({
  count,
}: HeaderNotificationsProps) {
  const hasNotifications = count > 0;

  return (
    <Link
      href="/alerts"
      aria-label="التنبيهات"
      title="التنبيهات"
      className={[
        "relative flex h-11 w-11 items-center justify-center rounded-2xl",
        "border border-[var(--app-border)]",
        "bg-[var(--app-card)]",
        "text-[var(--app-text)]",
        "shadow-[var(--app-shadow-sm)]",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5",
        "hover:border-[var(--app-accent)]",
        "hover:bg-[var(--app-card-soft)]",
        "hover:text-[var(--app-accent)]",
        "hover:shadow-[var(--app-shadow-gold)]",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-[var(--app-accent-soft)]",
      ].join(" ")}
    >
      <Bell
        size={19}
        className={[
          "transition-colors duration-200",
          hasNotifications ? "text-[var(--app-accent)]" : "",
        ].join(" ")}
      />

      {hasNotifications && (
        <>
          <span
            className="
              absolute
              -left-1
              -top-1
              flex
              h-5
              min-w-5
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-[var(--app-destructive)]
              px-1
              text-[10px]
              font-black
              leading-none
              text-white
              shadow-lg
            "
          >
            {count > 99 ? "99+" : count}
          </span>

          <span
            className="
              pointer-events-none
              absolute
              inset-0
              rounded-2xl
              border
              border-[var(--app-accent)]
              opacity-20
              animate-pulse
            "
          />
        </>
      )}
    </Link>
  );
}