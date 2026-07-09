import Link from "next/link";
import { Bell } from "lucide-react";

type HeaderNotificationsProps = {
  count: number;
};

export default function HeaderNotifications({
  count,
}: HeaderNotificationsProps) {
  return (
    <Link
      href="/alerts"
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)]"
      aria-label="التنبيهات"
      title="التنبيهات"
    >
      <Bell size={19} />

      {count > 0 && (
        <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}