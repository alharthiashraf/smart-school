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
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
      aria-label="التنبيهات"
    >
      <Bell size={19} />

      {count > 0 && (
        <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}