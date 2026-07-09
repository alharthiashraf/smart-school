type DataTableLoadingProps = {
  columns?: number;
  rows?: number;
};

export default function DataTableLoading({
  columns = 5,
  rows = 6,
}: DataTableLoadingProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--app-border)] bg-[var(--app-card-soft)]">
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-4 py-4">
                <div className="h-4 w-24 animate-pulse rounded-lg bg-[var(--app-muted)]" />
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-[var(--app-border)]">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-4">
                  <div className="h-4 w-full max-w-[180px] animate-pulse rounded-lg bg-[var(--app-muted)]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
