import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumb({
  items,
  className = "",
}: BreadcrumbProps) {
  return (
    <nav
      className={`mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400 ${className}`}
      aria-label="مسار الصفحة"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 transition hover:text-emerald-700"
      >
        <Home className="h-4 w-4" />
        الرئيسية
      </Link>

      {items.map((item, index) => (
        <span
          key={`${item.label}-${index}`}
          className="inline-flex items-center gap-2"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />

          {item.href ? (
            <Link
              href={item.href}
              className="transition hover:text-emerald-700"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-600">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}