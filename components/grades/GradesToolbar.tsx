"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type LucideIcon,
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

type Props = {
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

function clean(value: string | null | undefined) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeArabic(value: string | null | undefined) {
  return clean(value)
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function displayStage(value: string | null | undefined) {
  const n = normalizeArabic(value);

  if (n.includes("ابتدائي")) return "المرحلة الابتدائية";
  if (n.includes("متوسط")) return "المرحلة المتوسطة";
  if (n.includes("ثانوي")) return "المرحلة الثانوية";

  return clean(value);
}

function stageKey(value: string | null | undefined) {
  const n = normalizeArabic(value);

  if (n.includes("ابتدائي")) return "ابتدائي";
  if (n.includes("متوسط")) return "متوسط";
  if (n.includes("ثانوي")) return "ثانوي";

  return n;
}

function normalizeSemester(value: string | null | undefined) {
  const n = normalizeArabic(value);

  if (n.includes("اول")) return "الفصل الدراسي الأول";
  if (n.includes("ثاني")) return "الفصل الدراسي الثاني";
  if (n.includes("ثالث")) return "الفصل الدراسي الثالث";

  return clean(value);
}

function unique(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function uniqueStages(values: (string | null | undefined)[]) {
  const map = new Map<string, string>();

  values.forEach((value) => {
    const key = stageKey(value);
    const display = displayStage(value);
    if (key && display) map.set(key, display);
  });

  return Array.from(map.values());
}

function uniqueSemesters(values: (string | null | undefined)[]) {
  const map = new Map<string, string>();

  values.forEach((value) => {
    const display = normalizeSemester(value);
    if (display) map.set(display, display);
  });

  return Array.from(map.values());
}

function sameYear(scheme: SchemeOption, academicYear: string) {
  return !academicYear || clean(scheme.academic_year) === academicYear;
}

function sameSemester(scheme: SchemeOption, semester: string) {
  return !semester || normalizeSemester(scheme.semester) === semester;
}

function sameStage(scheme: SchemeOption, stageName: string) {
  return !stageName || displayStage(scheme.stage_name) === stageName;
}

function sameGrade(scheme: SchemeOption, gradeName: string) {
  return !gradeName || clean(scheme.grade_name) === gradeName;
}

function sameTrack(scheme: SchemeOption, trackName: string) {
  return !trackName || clean(scheme.track_name) === trackName;
}

function sameSubject(scheme: SchemeOption, subjectName: string) {
  return !subjectName || clean(scheme.subject_name) === subjectName;
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
}: Props) {
  const [open, setOpen] = useState(true);

  const [academicYear, setAcademicYear] = useState("");
  const [semester, setSemester] = useState("");
  const [stageName, setStageName] = useState("");
  const [gradeName, setGradeName] = useState("");
  const [trackName, setTrackName] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const selectedScheme = useMemo(
    () => schemes.find((scheme) => scheme.id === selectedSchemeId) || null,
    [schemes, selectedSchemeId]
  );

  useEffect(() => {
    if (!selectedScheme) return;

    setAcademicYear(clean(selectedScheme.academic_year));
    setSemester(normalizeSemester(selectedScheme.semester));
    setStageName(displayStage(selectedScheme.stage_name));
    setGradeName(clean(selectedScheme.grade_name));
    setTrackName(clean(selectedScheme.track_name));
    setSubjectName(clean(selectedScheme.subject_name));
  }, [selectedScheme]);

  const yearOptions = useMemo(
    () => unique(schemes.map((scheme) => scheme.academic_year)),
    [schemes]
  );

  const semesterOptions = useMemo(() => {
    return uniqueSemesters(
      schemes
        .filter((scheme) => sameYear(scheme, academicYear))
        .map((scheme) => scheme.semester)
    );
  }, [schemes, academicYear]);

  const stageOptions = useMemo(() => {
    return uniqueStages(
      schemes
        .filter((scheme) => sameYear(scheme, academicYear))
        .filter((scheme) => sameSemester(scheme, semester))
        .map((scheme) => scheme.stage_name)
    );
  }, [schemes, academicYear, semester]);

  const gradeOptions = useMemo(() => {
    return unique(
      schemes
        .filter((scheme) => sameYear(scheme, academicYear))
        .filter((scheme) => sameSemester(scheme, semester))
        .filter((scheme) => sameStage(scheme, stageName))
        .map((scheme) => scheme.grade_name)
    );
  }, [schemes, academicYear, semester, stageName]);

  const trackOptions = useMemo(() => {
    return unique(
      schemes
        .filter((scheme) => sameYear(scheme, academicYear))
        .filter((scheme) => sameSemester(scheme, semester))
        .filter((scheme) => sameStage(scheme, stageName))
        .filter((scheme) => sameGrade(scheme, gradeName))
        .map((scheme) => scheme.track_name)
    );
  }, [schemes, academicYear, semester, stageName, gradeName]);

  const subjectOptions = useMemo(() => {
    return unique(
      schemes
        .filter((scheme) => sameYear(scheme, academicYear))
        .filter((scheme) => sameSemester(scheme, semester))
        .filter((scheme) => sameStage(scheme, stageName))
        .filter((scheme) => sameGrade(scheme, gradeName))
        .filter((scheme) => sameTrack(scheme, trackName))
        .map((scheme) => scheme.subject_name)
    );
  }, [schemes, academicYear, semester, stageName, gradeName, trackName]);

  function handleSearchScheme() {
    const matched = schemes.find((scheme) => {
      return (
        sameYear(scheme, academicYear) &&
        sameSemester(scheme, semester) &&
        sameStage(scheme, stageName) &&
        sameGrade(scheme, gradeName) &&
        sameTrack(scheme, trackName) &&
        sameSubject(scheme, subjectName)
      );
    });

    if (matched?.id) {
      onSchemeChange(matched.id);
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
    <section className="rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <TabButton active={activeTab === "subjects"} icon={BookOpen} label="درجات المواد" onClick={() => onTabChange("subjects")} />
        <TabButton active={activeTab === "behavior"} icon={ShieldCheck} label="السلوك" onClick={() => onTabChange("behavior")} />
        <TabButton active={activeTab === "attendance"} icon={Clock3} label="المواظبة" onClick={() => onTabChange("attendance")} />
        <TabButton active={activeTab === "analytics"} icon={BarChart3} label="التحليلات" onClick={() => onTabChange("analytics")} />
        <TabButton active={activeTab === "history"} icon={History} label="السجل" onClick={() => onTabChange("history")} />
      </div>

      <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mb-3 flex w-full items-center justify-between text-sm font-black text-slate-800"
        >
          <span className="inline-flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#0f1f3d]" />
            التصفية
          </span>

          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {open && (
          <>
            {activeTab === "subjects" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="السنة الدراسية" required>
                  <Select value={academicYear} onChange={resetAfterYear} placeholder="-- اختر --" options={yearOptions} />
                </Field>

                <Field label="الفصل الدراسي" required>
                  <Select value={semester} onChange={resetAfterSemester} placeholder="-- اختر --" options={semesterOptions} />
                </Field>

                <Field label="المرحلة" required>
                  <Select value={stageName} onChange={resetAfterStage} placeholder="-- لا يوجد --" options={stageOptions} />
                </Field>

                <Field label="الصف" required>
                  <Select value={gradeName} onChange={resetAfterGrade} placeholder="-- لا يوجد --" options={gradeOptions} />
                </Field>

                <Field label="المسار">
                  <Select value={trackName} onChange={resetAfterTrack} placeholder="-- لا يوجد --" options={trackOptions} />
                </Field>

                <Field label="المادة" required>
                  <Select value={subjectName} onChange={setSubjectName} placeholder="-- لا يوجد --" options={subjectOptions} />
                </Field>

                <Field label="الفصل">
                  <select
                    value={classroomId}
                    onChange={(event) => onClassroomChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#d4af37]"
                  >
                    <option value="all">كل الفصول</option>

                    {classrooms.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.classroom_name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSearchScheme}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-800"
                  >
                    <Search className="h-4 w-4" />
                    ابحث
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
                {activeTab === "behavior" && "السلوك مستقل عن المواد"}
                {activeTab === "attendance" && "المواظبة مستقلة عن المواد"}
                {activeTab === "analytics" && "تحليلات جميع التقييمات"}
                {activeTab === "history" && "سجل السلوك والمواظبة"}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={17}
                />

                <input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="بحث باسم الطالب أو الهوية أو الرقم الأكاديمي..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-sm font-bold outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Tool icon={RefreshCcw} label="تحديث" onClick={onRefresh} />
                <Tool icon={Upload} label="استيراد" onClick={onImport} />
                <Tool icon={Download} label="Excel" onClick={onExportExcel} />
                <Tool icon={Printer} label="PDF" onClick={onExportPDF} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Tool icon={ShieldCheck} label="اعتماد" onClick={onApprove} />
          <Tool icon={Lock} label="إقفال" onClick={onLock} />
          <Tool icon={Settings} label="التوزيع" onClick={onSettings} />
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
          <FileText className="h-4 w-4 text-[#d4af37]" />
          مركز التقييم الأكاديمي V2
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-black text-slate-600">
        {label}
        {required && <span className="mr-1 text-red-500">*</span>}
      </div>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#d4af37]"
    >
      <option value="">{placeholder}</option>

      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition ${
        active
          ? "bg-[#0f1f3d] text-white shadow-sm"
          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-[#d4af37]" : "text-slate-400"}`} />
      {label}
    </button>
  );
}

function Tool({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
