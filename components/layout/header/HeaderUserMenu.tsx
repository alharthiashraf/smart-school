"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";

type HeaderUser = {
  full_name: string;
  email: string;
};

type HeaderUserMenuProps = {
  user: HeaderUser;
  roleName: string;
  schoolName?: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
};

export default function HeaderUserMenu({
  user,
  roleName,
  schoolName,
  open,
  onToggle,
  onClose,
  onLogout,
}: HeaderUserMenuProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] px-2.5 text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)] md:px-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-teal)] text-white">
          <UserRound size={17} />
        </div>

        <div className="hidden min-w-0 text-right md:block">
          <p className="max-w-[150px] truncate text-sm font-black">
            {user.full_name}
          </p>
          <p className="truncate text-[11px] font-bold text-[var(--app-teal)]">
            {roleName}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl">
          <div className="border-b border-[var(--app-border)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-teal)] text-white">
                <UserRound size={22} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--app-text)]">
                  {user.full_name}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--app-text-muted)]">
                  {user.email || "بدون بريد"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-black text-[var(--app-text)]">
                {roleName}
              </span>

              <span className="rounded-full bg-[var(--app-teal-soft)] px-3 py-1 text-xs font-black text-[var(--app-teal)]">
                {schoolName || "بدون مدرسة"}
              </span>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-[var(--app-text)] transition hover:bg-[var(--app-card-soft)]"
            >
              <Settings size={17} />
              الإعدادات
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
            >
              <LogOut size={17} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
}