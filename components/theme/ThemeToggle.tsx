"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="تبديل المظهر"
        disabled
        className="
          flex h-10 w-[76px] items-center rounded-full
          border border-[var(--app-border)]
          bg-[var(--app-card)]
          p-1
          shadow-[var(--app-shadow-sm)]
        "
      >
        <span
          className="
            flex h-8 w-8 items-center justify-center rounded-full
            bg-[var(--app-accent)]
            text-[var(--app-accent-foreground)]
          "
        >
          <Sun size={16} />
        </span>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الغامق"}
      title={isDark ? "الوضع الفاتح" : "الوضع الغامق"}
      className="
        relative inline-flex h-10 w-[76px] items-center rounded-full
        border border-[var(--app-border)]
        bg-[var(--app-card)]
        p-1
        shadow-[var(--app-shadow-sm)]
        transition-all duration-300
        hover:border-[var(--app-accent)]
        hover:shadow-[var(--app-shadow-gold)]
        focus-visible:outline-none
        focus-visible:ring-4
        focus-visible:ring-[var(--app-focus-ring)]
      "
    >
      <span
        className={[
          "absolute flex h-8 w-8 items-center justify-center rounded-full",
          "transition-all duration-300 ease-out",
          isDark
            ? "right-1 bg-[var(--app-accent)] text-[var(--app-accent-foreground)]"
            : "left-1 bg-[var(--app-primary)] text-white",
        ].join(" ")}
      >
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>

      <span className="flex w-full items-center justify-between px-2 text-[10px] font-black">
        <Moon
          size={14}
          className={
            isDark
              ? "text-[var(--app-text-muted)]"
              : "text-[var(--app-text-soft)]"
          }
        />

        <Sun
          size={14}
          className={
            isDark
              ? "text-[var(--app-text-soft)]"
              : "text-[var(--app-text-muted)]"
          }
        />
      </span>
    </button>
  );
}