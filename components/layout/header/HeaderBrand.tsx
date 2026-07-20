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
  const schoolLabel = schoolName || "لم يتم تحديد مدرسة";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="
            hidden
            h-10
            w-1
            shrink-0
            rounded-full
            bg-gradient-to-b
            from-[var(--app-accent)]
            to-[var(--app-gold-700)]
            shadow-[var(--app-shadow-gold)]
            sm:block
          "
        />

        <div className="min-w-0">
          <h1
            className="
              truncate
              text-lg
              font-black
              tracking-tight
              text-[var(--app-text)]
            "
          >
            {title}
          </h1>

          <div
            className="
              mt-1.5
              flex
              min-w-0
              flex-wrap
              items-center
              gap-2
              text-xs
              font-semibold
              text-[var(--app-text-muted)]
            "
          >
            <span className="max-w-[240px] truncate">
              {schoolLabel}
            </span>

            {academicYear && (
              <>
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[var(--app-accent)]"
                />

                <span className="whitespace-nowrap">
                  {academicYear}
                </span>
              </>
            )}

            {semester && (
              <>
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-[var(--app-accent)]"
                />

                <span className="max-w-[180px] truncate">
                  {semester}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}