"use client";

import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

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
  const displayedSchoolName = schoolName || "بدون مدرسة";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          "flex h-11 items-center gap-2 rounded-2xl",
          "border border-[var(--app-border)]",
          "bg-[var(--app-card)]",
          "px-2.5 text-[var(--app-text)]",
          "shadow-[var(--app-shadow-sm)]",
          "transition-all duration-200",
          "hover:border-[var(--app-accent-border)]",
          "hover:bg-[var(--app-card-soft)]",
          "hover:shadow-[var(--app-shadow-md)]",
          "md:px-3",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            "border border-[var(--app-accent-border)]",
            "bg-[var(--app-accent-soft)]",
            "text-[var(--app-accent)]",
          ].join(" ")}
        >
          <UserRound size={17} />
        </div>

        <div className="hidden min-w-0 text-right md:block">
          <p className="max-w-[150px] truncate text-sm font-black text-[var(--app-text)]">
            {user.full_name}
          </p>

          <p className="truncate text-[11px] font-bold text-[var(--app-accent)]">
            {roleName}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={[
            "text-[var(--app-text-muted)]",
            "transition-transform duration-200",
            open ? "rotate-180 text-[var(--app-accent)]" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق قائمة المستخدم"
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            role="menu"
            className={[
              "absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-3xl",
              "border border-[var(--app-border)]",
              "bg-[var(--app-card)]",
              "text-[var(--app-text)]",
              "shadow-[var(--app-shadow-lg)]",
            ].join(" ")}
          >
            <div
              className={[
                "relative overflow-hidden",
                "border-b border-[var(--app-border)]",
                "bg-[var(--app-card-soft)]",
                "p-4",
              ].join(" ")}
            >
              <div
                aria-hidden="true"
                className={[
                  "pointer-events-none absolute -left-12 -top-12",
                  "h-28 w-28 rounded-full",
                  "bg-[var(--app-accent-soft)] blur-2xl",
                ].join(" ")}
              />

              <div className="relative flex items-center gap-3">
                <div
                  className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center",
                    "rounded-2xl",
                    "border border-[var(--app-accent-border)]",
                    "bg-[var(--app-accent)]",
                    "text-[var(--app-accent-foreground)]",
                    "shadow-[var(--app-shadow-gold)]",
                  ].join(" ")}
                >
                  <UserRound size={22} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[var(--app-text-strong)]">
                    {user.full_name}
                  </p>

                  <p className="mt-1 truncate text-xs text-[var(--app-text-muted)]">
                    {user.email || "بدون بريد"}
                  </p>
                </div>
              </div>

              <div className="relative mt-3 flex flex-wrap gap-2">
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    "border-[var(--app-accent-border)]",
                    "bg-[var(--app-accent-soft)]",
                    "text-[var(--app-accent)]",
                  ].join(" ")}
                >
                  {roleName}
                </span>

                <span
                  className={[
                    "max-w-full truncate rounded-full border px-3 py-1",
                    "text-xs font-black",
                    "border-[var(--app-border)]",
                    "bg-[var(--app-card)]",
                    "text-[var(--app-text-muted)]",
                  ].join(" ")}
                >
                  {displayedSchoolName}
                </span>
              </div>
            </div>

            <div className="space-y-1 p-2">
              <Link
                href="/settings"
                onClick={onClose}
                role="menuitem"
                className={[
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                  "text-sm font-bold text-[var(--app-text)]",
                  "transition-all duration-200",
                  "hover:bg-[var(--app-primary-soft)]",
                  "hover:text-[var(--app-primary)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    "bg-[var(--app-primary-soft)]",
                    "text-[var(--app-primary)]",
                  ].join(" ")}
                >
                  <Settings size={17} />
                </span>

                الإعدادات
              </Link>

              <button
                type="button"
                onClick={onLogout}
                role="menuitem"
                className={[
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5",
                  "text-sm font-bold text-[var(--app-destructive)]",
                  "transition-all duration-200",
                  "hover:bg-[var(--app-destructive-soft)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    "bg-[var(--app-destructive-soft)]",
                    "text-[var(--app-destructive)]",
                  ].join(" ")}
                >
                  <LogOut size={17} />
                </span>

                تسجيل الخروج
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
