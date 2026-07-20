"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function AppHeader() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const [keyword, setKeyword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = keyword.trim();
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  }

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[color:var(--app-bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1700px] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <Link
          href="/home"
          className="hidden min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-[var(--app-card-soft)] md:flex"
          aria-label="العودة إلى الرئيسية"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary)] text-sm font-black text-white">
            م
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-[var(--app-text)]">
              منصة المدرسة الذكية
            </span>
            <span className="block truncate text-xs text-[var(--app-text-muted)]">
              نظام الإدارة المدرسية
            </span>
          </span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="mx-auto flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] px-3 shadow-sm transition focus-within:border-[var(--app-primary)] focus-within:ring-2 focus-within:ring-[var(--app-primary)]/10 md:max-w-2xl"
        >
          <Search size={18} className="shrink-0 text-[var(--app-text-muted)]" />

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-text-muted)]"
            placeholder="ابحث في المنصة..."
            aria-label="البحث في المنصة"
          />
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] transition hover:bg-[var(--app-card-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30"
            aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
            title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            disabled={!mounted}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] transition hover:bg-[var(--app-card-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30"
            aria-label="التنبيهات"
            title="التنبيهات"
          >
            <Bell size={19} />
            <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[var(--app-danger)] ring-2 ring-[var(--app-card)]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
