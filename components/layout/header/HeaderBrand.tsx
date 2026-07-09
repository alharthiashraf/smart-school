type HeaderBrandProps = {
  title: string;
  schoolName?: string;
  academicYear?: string | null;
  semester?: string | null;
};

export default function HeaderBrand({
  title,
  schoolName,
  academicYear,
  semester,
}: HeaderBrandProps) {
  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-base font-black text-[var(--app-text)]">
        {title}
      </h1>

      <p className="mt-0.5 truncate text-xs font-bold text-[var(--app-text-muted)]">
        {schoolName || "لم يتم تحديد مدرسة"}
        {academicYear ? ` • ${academicYear}` : ""}
        {semester ? ` • ${semester}` : ""}
      </p>
    </div>
  );
}