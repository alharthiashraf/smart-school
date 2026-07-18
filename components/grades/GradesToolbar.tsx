"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileText,
  Filter,
  History,
  Lock,
  Printer,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { StatusBadge } from "@/components/ui/badges";
import {
  ExportButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/buttons";
import { BaseCard } from "@/components/ui/cards";
import {
  SearchInput,
  Select,
  type SelectOption,
} from "@/components/ui/inputs";
import { Tabs } from "@/components/ui/navigation";
import { TableFilters } from "@/components/ui/tables";

export type GradesTab =
  | "subjects"
  | "behavior"
  | "attendance"
  | "analytics"
  | "history";

export type SchemeOption = {
  id: string;
  stage_name?: string | null;
  grade_name?: string | null;
  track_name?: string | null;
  subject_name?: string | null;
  semester?: string | null;
  academic_year?: string | null;
};

export type ClassroomOption = {
  id: string;
  classroom_name: string;
};

export type GradesToolbarProps = {
  activeTab: GradesTab;
  onTabChange: (tab: GradesTab) => void;

  schemes: SchemeOption[];
  selectedSchemeId: string;
  onSchemeChange: (id: string) => void;

  classrooms: ClassroomOption[];
  classroomId: string;
  onClassroomChange: (id: string) => void;

  search: string;
  onSearchChange: (value: string) => void;

  onRefresh?: () => void;
  onImport?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onApprove?: () => void;
  onLock?: () => void;
  onSettings?: () => void;
};

const tabs = [
  {
    value: "subjects",
    label: "درجات المواد",
    icon: <BookOpen aria-hidden="true" className="h-4 w-4" />,
  },
  {
    value: "behavior",
    label: "السلوك",
    icon: <ShieldCheck aria-hidden="true" className="h-4 w-4" />,
  },
  {
    value: "attendance",
    label: "المواظبة",
    icon: <Clock3 aria-hidden="true" className="h-4 w-4" />,
  },
  {
    value: "analytics",
    label: "التحليلات",
    icon: <BarChart3 aria-hidden="true" className="h-4 w-4" />,
  },
  {
    value: "history",
    label: "السجل",
    icon: <History aria-hidden="true" className="h-4 w-4" />,
  },
];

function clean(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeArabic(value: string | null | undefined) {
  return clean(value)
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function displayStage(value: string | null | undefined) {
  const normalized = normalizeArabic(value);

  if (normalized.includes("ابتدائي")) {
    return "المرحلة الابتدائية";
  }

  if (normalized.includes("متوسط")) {
    return "المرحلة المتوسطة";
  }

  if (normalized.includes("ثانوي")) {
    return "المرحلة الثانوية";
  }

  return clean(value);
}

function stageKey(value: string | null | undefined) {
  const normalized = normalizeArabic(value);

  if (normalized.includes("ابتدائي")) return "ابتدائي";
  if (normalized.includes("متوسط")) return "متوسط";
  if (normalized.includes("ثانوي")) return "ثانوي";

  return normalized;
}

function normalizeSemester(value: string | null | undefined) {
  const normalized = normalizeArabic(value);

  if (normalized.includes("اول")) {
    return "الفصل الدراسي الأول";
  }

  if (normalized.includes("ثاني")) {
    return "الفصل الدراسي الثاني";
  }

  if (normalized.includes("ثالث")) {
    return "الفصل الدراسي الثالث";
  }

  return clean(value);
}

function unique(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(values.map(clean).filter(Boolean)),
  );
}

function uniqueStages(
  values: (string | null | undefined)[],
) {
  const map = new Map<string, string>();

  values.forEach((value) => {
    const key = stageKey(value);
    const display = displayStage(value);

    if (key && display) {
      map.set(key, display);
    }
  });

  return Array.from(map.values());
}

function uniqueSemesters(
  values: (string | null | undefined)[],
) {
  const map = new Map<string, string>();

  values.forEach((value) => {
    const display = normalizeSemester(value);

    if (display) {
      map.set(display, display);
    }
  });

  return Array.from(map.values());
}

function sameYear(
  scheme: SchemeOption,
  academicYear: string,
) {
  return (
    !academicYear ||
    clean(scheme.academic_year) === academicYear
  );
}

function sameSemester(
  scheme: SchemeOption,
  semester: string,
) {
  return (
    !semester ||
    normalizeSemester(scheme.semester) === semester
  );
}

function sameStage(
  scheme: SchemeOption,
  stageName: string,
) {
  return (
    !stageName ||
    displayStage(scheme.stage_name) === stageName
  );
}

function sameGrade(
  scheme: SchemeOption,
  gradeName: string,
) {
  return (
    !gradeName ||
    clean(scheme.grade_name) === gradeName
  );
}

function sameTrack(
  scheme: SchemeOption,
  trackName: string,
) {
  return (
    !trackName ||
    clean(scheme.track_name) === trackName
  );
}

function sameSubject(
  scheme: SchemeOption,
  subjectName: string,
) {
  return (
    !subjectName ||
    clean(scheme.subject_name) === subjectName
  );
}

function toSelectOptions(values: string[]): SelectOption[] {
  return values.map((value) => ({
    label: value,
    value,
  }));
}

export default function GradesToolbar({
  activeTab,
  onTabChange,
  schemes,
  selectedSchemeId,
  onSchemeChange,
  classrooms,
  classroomId,
  onClassroomChange,
  search,
  onSearchChange,
  onRefresh,
  onImport,
  onExportExcel,
  onExportPDF,
  onApprove,
  onLock,
  onSettings,
}: GradesToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [stageName, setStageName] = useState("");
  const [gradeName, setGradeName] = useState("");
  const [trackName, setTrackName] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const selectedScheme = useMemo(
    () =>
      schemes.find(
        (scheme) => scheme.id === selectedSchemeId,
      ) ?? null,
    [schemes, selectedSchemeId],
  );

  useEffect(() => {
    if (!selectedScheme) return;

    setAcademicYear(
      clean(selectedScheme.academic_year),
    );

    setSemester(
      normalizeSemester(selectedScheme.semester),
    );

    setStageName(
      displayStage(selectedScheme.stage_name),
    );

    setGradeName(
      clean(selectedScheme.grade_name),
    );

    setTrackName(
      clean(selectedScheme.track_name),
    );

    setSubjectName(
      clean(selectedScheme.subject_name),
    );
  }, [selectedScheme]);

  const yearOptions = useMemo(
    () =>
      toSelectOptions(
        unique(
          schemes.map(
            (scheme) => scheme.academic_year,
          ),
        ),
      ),
    [schemes],
  );

  const semesterOptions = useMemo(
    () =>
      toSelectOptions(
        uniqueSemesters(
          schemes
            .filter((scheme) =>
              sameYear(scheme, academicYear),
            )
            .map((scheme) => scheme.semester),
        ),
      ),
    [academicYear, schemes],
  );

  const stageOptions = useMemo(
    () =>
      toSelectOptions(
        uniqueStages(
          schemes
            .filter((scheme) =>
              sameYear(scheme, academicYear),
            )
            .filter((scheme) =>
              sameSemester(scheme, semester),
            )
            .map((scheme) => scheme.stage_name),
        ),
      ),
    [academicYear, schemes, semester],
  );

  const gradeOptions = useMemo(
    () =>
      toSelectOptions(
        unique(
          schemes
            .filter((scheme) =>
              sameYear(scheme, academicYear),
            )
            .filter((scheme) =>
              sameSemester(scheme, semester),
            )
            .filter((scheme) =>
              sameStage(scheme, stageName),
            )
            .map((scheme) => scheme.grade_name),
        ),
      ),
    [academicYear, schemes, semester, stageName],
  );

  const trackOptions = useMemo(
    () =>
      toSelectOptions(
        unique(
          schemes
            .filter((scheme) =>
              sameYear(scheme, academicYear),
            )
            .filter((scheme) =>
              sameSemester(scheme, semester),
            )
            .filter((scheme) =>
              sameStage(scheme, stageName),
            )
            .filter((scheme) =>
              sameGrade(scheme, gradeName),
            )
            .map((scheme) => scheme.track_name),
        ),
      ),
    [
      academicYear,
      gradeName,
      schemes,
      semester,
      stageName,
    ],
  );

  const subjectOptions = useMemo(
    () =>
      toSelectOptions(
        unique(
          schemes
            .filter((scheme) =>
              sameYear(scheme, academicYear),
            )
            .filter((scheme) =>
              sameSemester(scheme, semester),
            )
            .filter((scheme) =>
              sameStage(scheme, stageName),
            )
            .filter((scheme) =>
              sameGrade(scheme, gradeName),
            )
            .filter((scheme) =>
              sameTrack(scheme, trackName),
            )
            .map((scheme) => scheme.subject_name),
        ),
      ),
    [
      academicYear,
      gradeName,
      schemes,
      semester,
      stageName,
      trackName,
    ],
  );

  const classroomOptions = useMemo<SelectOption[]>(
    () => [
      {
        label: "كل الفصول",
        value: "all",
      },
      ...classrooms.map((classroom) => ({
        label: classroom.classroom_name,
        value: classroom.id,
      })),
    ],
    [classrooms],
  );

  const activeDescription = useMemo(() => {
    if (activeTab === "behavior") {
      return "السلوك مستقل تمامًا عن درجات المواد.";
    }

    if (activeTab === "attendance") {
      return "المواظبة مستقلة تمامًا عن درجات المواد.";
    }

    if (activeTab === "analytics") {
      return "تحليلات موحدة للمواد والسلوك والمواظبة.";
    }

    if (activeTab === "history") {
      return "السجل الكامل للعمليات والتعديلات.";
    }

    return "";
  }, [activeTab]);

  const canSearchScheme =
    Boolean(academicYear) &&
    Boolean(semester) &&
    Boolean(stageName) &&
    Boolean(gradeName) &&
    Boolean(subjectName);

  function handleSearchScheme() {
    const matchedScheme = schemes.find((scheme) => {
      return (
        sameYear(scheme, academicYear) &&
        sameSemester(scheme, semester) &&
        sameStage(scheme, stageName) &&
        sameGrade(scheme, gradeName) &&
        sameTrack(scheme, trackName) &&
        sameSubject(scheme, subjectName)
      );
    });

    if (matchedScheme?.id) {
      onSchemeChange(matchedScheme.id);
    }
  }

  function resetAfterYear(value: string) {
    setAcademicYear(value);
    setSemester("");
    setStageName("");
    setGradeName("");
    setTrackName("");
    setSubjectName("");
  }

  function resetAfterSemester(value: string) {
    setSemester(value);
    setStageName("");
    setGradeName("");
    setTrackName("");
    setSubjectName("");
  }

  function resetAfterStage(value: string) {
    setStageName(value);
    setGradeName("");
    setTrackName("");
    setSubjectName("");
  }

  function resetAfterGrade(value: string) {
    setGradeName(value);
    setTrackName("");
    setSubjectName("");
  }

  function resetAfterTrack(value: string) {
    setTrackName(value);
    setSubjectName("");
  }

  return (
    <BaseCard
      as="section"
      padding="sm"
      variant="elevated"
      className="space-y-4"
    >
      <Tabs
        tabs={tabs}
        value={activeTab}
        onChange={(value) =>
          onTabChange(value as GradesTab)
        }
      />

      <TableFilters
        title="التصفية"
        actions={
          <button
            type="button"
            onClick={() =>
              setFiltersOpen((value) => !value)
            }
            aria-expanded={filtersOpen}
            aria-controls="grades-toolbar-filters"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--app-radius-md)] border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text-muted)] transition hover:bg-[var(--app-card-soft)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
            title={
              filtersOpen
                ? "إخفاء الفلاتر"
                : "إظهار الفلاتر"
            }
          >
            {filtersOpen ? (
              <ChevronUp
                aria-hidden="true"
                className="h-4 w-4"
              />
            ) : (
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4"
              />
            )}
          </button>
        }
      >
        <div
          id="grades-toolbar-filters"
          className={
            filtersOpen
              ? "contents"
              : "hidden"
          }
        >
          {activeTab === "subjects" ? (
            <>
              <Select
                label="السنة الدراسية"
                required
                value={academicYear}
                onChange={(event) =>
                  resetAfterYear(event.target.value)
                }
                options={yearOptions}
                placeholder="اختر السنة"
              />

              <Select
                label="الفصل الدراسي"
                required
                value={semester}
                onChange={(event) =>
                  resetAfterSemester(
                    event.target.value,
                  )
                }
                options={semesterOptions}
                placeholder="اختر الفصل"
                disabled={!academicYear}
              />

              <Select
                label="المرحلة"
                required
                value={stageName}
                onChange={(event) =>
                  resetAfterStage(event.target.value)
                }
                options={stageOptions}
                placeholder="اختر المرحلة"
                disabled={!semester}
              />

              <Select
                label="الصف"
                required
                value={gradeName}
                onChange={(event) =>
                  resetAfterGrade(event.target.value)
                }
                options={gradeOptions}
                placeholder="اختر الصف"
                disabled={!stageName}
              />

              <Select
                label="المسار"
                value={trackName}
                onChange={(event) =>
                  resetAfterTrack(event.target.value)
                }
                options={trackOptions}
                placeholder="جميع المسارات"
                disabled={!gradeName}
              />

              <Select
                label="المادة"
                required
                value={subjectName}
                onChange={(event) =>
                  setSubjectName(event.target.value)
                }
                options={subjectOptions}
                placeholder="اختر المادة"
                disabled={!gradeName}
              />

              <Select
                label="الفصل"
                value={classroomId}
                onChange={(event) =>
                  onClassroomChange(
                    event.target.value,
                  )
                }
                options={classroomOptions}
                placeholder="كل الفصول"
              />

              <div className="flex items-end">
                <PrimaryButton
                  type="button"
                  onClick={handleSearchScheme}
                  disabled={!canSearchScheme}
                  icon={
                    <Search
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  }
                  className="w-full"
                >
                  تطبيق التصفية
                </PrimaryButton>
              </div>
            </>
          ) : (
            <div className="md:col-span-2 xl:col-span-4">
              <div className="flex min-h-11 items-center gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text-muted)]">
                <Filter
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[var(--app-primary)]"
                />

                {activeDescription}
              </div>
            </div>
          )}
        </div>
      </TableFilters>

      {filtersOpen && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="بحث باسم الطالب أو الهوية أو الرقم الأكاديمي..."
          />

          <div className="flex flex-wrap items-center gap-2">
            <SecondaryButton
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh}
              icon={
                <RefreshCcw
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              }
            >
              تحديث
            </SecondaryButton>

            <SecondaryButton
              type="button"
              onClick={onImport}
              disabled={!onImport}
              icon={
                <Upload
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              }
            >
              استيراد
            </SecondaryButton>

            <ExportButton
              type="button"
              onClick={onExportExcel}
              disabled={!onExportExcel}
              icon={
                <Download
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              }
            >
              Excel
            </ExportButton>

            <ExportButton
              type="button"
              onClick={onExportPDF}
              disabled={!onExportPDF}
              icon={
                <Printer
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              }
            >
              PDF
            </ExportButton>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-[var(--app-border)] pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton
            type="button"
            onClick={onApprove}
            disabled={!onApprove}
            icon={
              <ShieldCheck
                aria-hidden="true"
                className="h-4 w-4"
              />
            }
          >
            اعتماد
          </SecondaryButton>

          <SecondaryButton
            type="button"
            onClick={onLock}
            disabled={!onLock}
            icon={
              <Lock
                aria-hidden="true"
                className="h-4 w-4"
              />
            }
          >
            إقفال
          </SecondaryButton>

          <SecondaryButton
            type="button"
            onClick={onSettings}
            disabled={!onSettings}
            icon={
              <Settings
                aria-hidden="true"
                className="h-4 w-4"
              />
            }
          >
            التوزيع
          </SecondaryButton>
        </div>

        <StatusBadge
          tone="primary"
          icon={
            <FileText
              aria-hidden="true"
              className="h-4 w-4"
            />
          }
        >
          مركز التقييم الأكاديمي V2
        </StatusBadge>
      </div>
    </BaseCard>
  );
}

