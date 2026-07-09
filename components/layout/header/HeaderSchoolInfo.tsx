import { Moon, Sun } from "lucide-react";

type HeaderSchoolInfoProps = {
  theme: "smart-light" | "smart-dark";
  onToggleTheme: () => void;
};

export default function HeaderSchoolInfo({
  theme,
  onToggleTheme,
}: HeaderSchoolInfoProps) {
  return (
    <button
      type="button"
      onClick={onToggleTheme}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
      aria-label="تبديل المظهر"
    >
      {theme === "smart-dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}