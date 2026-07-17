export type DataTableLoadingProps = {
  columns?: number;
  rows?: number;
  className?: string;
};

export default function DataTableLoading({
  columns = 5,
  rows = 6,
  className,
}: DataTableLoadingProps) {
  const safeColumns = Math.max(1, columns);
  const safeRows = Math.max(1, rows);

  return (
    <div
      className={["overflow-x-auto", className]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-label="جاري تحميل بيانات الجدول"
    >
      <table
        className="w-full min-w-[900px] border-collapse text-sm"
        aria-hidden="true"
      >
        <thead>
          <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)]">
            {Array.from({ length: safeColumns }).map((_, index) => (
              <th
                key={`header-${index}`}
                scope="col"
                className="px-4 py-4"
              >
                <div className="h-4 w-24 animate-pulse rounded-[var(--app-radius-sm)] bg-[var(--app-border)]" />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: safeRows }).map((_, rowIndex) => (
            <tr
              key={`row-${rowIndex}`}
              className="border-b border-[var(--app-border)] last:border-b-0"
            >
              {Array.from({ length: safeColumns }).map((_, columnIndex) => (
                <td
                  key={`cell-${rowIndex}-${columnIndex}`}
                  className="px-4 py-4"
                >
                  <div className="h-4 w-full max-w-[180px] animate-pulse rounded-[var(--app-radius-sm)] bg-[var(--app-card-soft)]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <span className="sr-only">جاري تحميل بيانات الجدول...</span>
    </div>
  );
}