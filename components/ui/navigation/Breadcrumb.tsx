import Link from "next/link";
import { ChevronLeft, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumb({
  items,
  className,
}: BreadcrumbProps) {
  return (
    <nav
      className={[
        "mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--app-text-muted)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="مسار الصفحة"
    >
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 transition hover:text-[var(--app-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-soft)]"
      >
        <Home aria-hidden="true" className="h-4 w-4" />
        الرئيسية
      </Link>

      {items.map((item, index) => {
        const isCurrent = !item.href;

        return (
          <span
            key={`${item.label}-${index}`}
            className="inline-flex items-center gap-2"
          >
            <ChevronLeft
              aria-hidden="true"
              className="h-3.5 w-3.5 text-[var(--app-border-strong)]"
            />

            {item.href ? (
              <Link
                href={item.href}
                className="transition hover:text-[var(--app-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary-soft)]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-[var(--app-text)]"
                aria-current={isCurrent ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}