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
        className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 text-slate-700 shadow-sm transition hover:bg-slate-50 md:px-3"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white">
          <UserRound size={17} />
        </div>

        <div className="hidden min-w-0 text-right md:block">
          <p className="max-w-[150px] truncate text-sm font-black">
            {user.full_name}
          </p>
          <p className="truncate text-[11px] font-bold text-emerald-700">
            {roleName}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <UserRound size={22} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">
                  {user.full_name}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {user.email || "بدون بريد"}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                {roleName}
              </span>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                {schoolName || "بدون مدرسة"}
              </span>
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Settings size={17} />
              الإعدادات
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
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