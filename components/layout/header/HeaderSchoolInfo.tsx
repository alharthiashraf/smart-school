"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function HeaderSchoolInfo() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "smart-dark";

  function toggleTheme() {
    setTheme(isDark ? "smart-light" : "smart-dark");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-card-soft)]"
      aria-label="تبديل المظهر"
      title="تبديل المظهر"
    >
      {!mounted ? (
        <Moon size={19} />
      ) : isDark ? (
        <Sun size={19} />
      ) : (
        <Moon size={19} />
      )}
    </button>
  );
}