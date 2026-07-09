"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import SharedExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";
import ErrorState from "@/components/ui/feedback/ErrorState";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import PageLoader from "@/components/ui/loading/PageLoader";
import RoleGuard from "@/components/auth/RoleGuard";
import { type SchoolRole } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";
import { exportTableToPDF } from "@/lib/exports/pdf";
import { exportTableToExcel } from "@/lib/exports/excel";

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Printer,
  RefreshCcw,
  School,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  UserCog,
  X,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnyRow = Record<string, unknown>;

type Toast = {
  type: "success" | "error";
  message: string;
};

type ExportType =
  | "general"
  | "students"
  | "teachers"
  | "classrooms"
  | "subjects"
  | "attendance"
  | "grades"
  | "conduct"
  | "schedules"
  | "teacherSubjects";

type ExportData = {
  title: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

type ReportGroupKey = "students" | "academic" | "operations" | "executive";

type ReportColor = "blue" | "green" | "teal" | "gold" | "red" | "slate";

type ReportCard = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  badge: string;
  color: ReportColor;
  exportType: ExportType;
  group: ReportGroupKey;
  keywords: string[];
};

type ReportGroup = {
  id: ReportGroupKey;
  title: string;
  description: string;
  icon: ReactNode;
};

type Stats = {
  students: number;
  teachers: number;
  classrooms: number;
  subjects: number;
  attendance: number;
  grades: number;
  conduct: number;
  schedules: number;
  teacherSubjects: number;
};

const REPORT_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "teacher",
];

const BRAND = {
  primary: "#15445A",
  teal: "#0DA9A6",
  blue: "#3D7EB9",
  green: "#07A869",
  gold: "#C1B489",
};

const CHART_COLORS = [BRAND.green, BRAND.blue, BRAND.teal, BRAND.gold, BRAND.primary];


function textValue(row: AnyRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function numberValue(row: AnyRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = Number(row[key]);

    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

function normalizeStatus(value: unknown) {
  const status = String(value || "").trim();

  if (status === "present" || status === "حاضر") return "حاضر";
  if (status === "absent" || status === "غائب") return "غائب";
  if (status === "late" || status === "متأخر") return "متأخر";
  if (status === "excused" || status === "معذور" || status === "مستأذن") return "معذور";

  return status || "غير مسجل";
}

function isPresent(row: AnyRow) {
  return normalizeStatus(row.attendance_status || row.status) === "حاضر";
}

function isAbsent(row: AnyRow) {
  return normalizeStatus(row.attendance_status || row.status) === "غائب";
}

function isLate(row: AnyRow) {
  return normalizeStatus(row.attendance_status || row.status) === "متأخر";
}

function getGradePercent(row: AnyRow) {
  const percentage = numberValue(row, ["percentage"], 0);
  if (percentage > 0) return Math.round(percentage);

  const score = numberValue(row, ["score", "total_score"], 0);
  const max = numberValue(row, ["max_score"], 0);

  if (score > 0 && max > 0) return Math.round((score / max) * 100);

  return 0;
}

function getStudentName(row: AnyRow) {
  return textValue(row, ["full_name", "student_name", "name"], "بدون اسم");
}

function getTeacherName(row: AnyRow) {
  return textValue(row, ["full_name", "teacher_name", "name"], "بدون اسم");
}

async function safeRead(table: string, limit = 1000, schoolId?: string) {
  try {
    let query = supabase.from(table).select("*").limit(limit);

    if (schoolId) {
      query = query.eq("school_id", schoolId);
    }

    const { data, error } = await query;

    if (!error) {
      return Array.isArray(data) ? (data as unknown as AnyRow[]) : [];
    }

    if (schoolId) {
      const fallback = await supabase.from(table).select("*").limit(limit);

      if (!fallback.error) {
        return Array.isArray(fallback.data) ? (fallback.data as unknown as AnyRow[]) : [];
      }
    }

    console.warn(`reports table skipped: ${table}`, error.message);
    return [];
  } catch (error) {
    console.warn(`reports table failed: ${table}`, error);
    return [];
  }
}


export default function ReportsPage() {
  const { currentSchool, loading: schoolLoading } = useSchool();

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  const [students, setStudents] = useState<AnyRow[]>([]);
  const [teachers, setTeachers] = useState<AnyRow[]>([]);
  const [classrooms, setClassrooms] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [attendance, setAttendance] = useState<AnyRow[]>([]);
  const [grades, setGrades] = useState<AnyRow[]>([]);
  const [conduct, setConduct] = useState<AnyRow[]>([]);
  const [schedules, setSchedules] = useState<AnyRow[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<AnyRow[]>([]);

  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"all" | ReportGroupKey>("all");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedClassroom, setSelectedClassroom] = useState("all");
  const [lastUpdate, setLastUpdate] = useState("غير متوفر");

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }, [currentSchool?.id]);

  const fetchReportsData = useCallback(async () => {
    setLoading(true);

    const [
      studentsData,
      teachersData,
      classroomsData,
      subjectsData,
      attendanceData,
      gradesData,
      conductData,
      schedulesData,
      teacherSubjectsData,
    ] = await Promise.all([
      safeRead("students", 1000, currentSchool?.id),
      safeRead("teachers", 1000, currentSchool?.id),
      safeRead("classrooms", 500, currentSchool?.id),
      safeRead("subjects", 500, currentSchool?.id),
      safeRead("student_attendance", 1200, currentSchool?.id),
      safeRead("student_grade_scores", 1200, currentSchool?.id),
safeRead("student_conduct_scores", 1200, currentSchool?.id),
      safeRead("schedules", 700, currentSchool?.id),
      safeRead("teacher_subjects", 700, currentSchool?.id),
    ]);

    setStudents(studentsData);
    setTeachers(teachersData);
    setClassrooms(classroomsData);
    setSubjects(subjectsData);
    setAttendance(attendanceData);
    setGrades(gradesData);
    setConduct(conductData);
    setSchedules(schedulesData);
    setTeacherSubjects(teacherSubjectsData);

    setLastUpdate(
      new Intl.DateTimeFormat("ar-SA", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    );

    setLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => {
    if (schoolLoading) return;

    if (!currentSchool?.id) {
      setLoading(false);
      return;
    }

    void fetchReportsData();
  }, [currentSchool?.id, fetchReportsData, schoolLoading]);

  const stats: Stats = useMemo(
    () => ({
      students: students.length,
      teachers: teachers.length,
      classrooms: classrooms.length,
      subjects: subjects.length,
      attendance: attendance.length,
      grades: grades.length,
      conduct: conduct.length,
      schedules: schedules.length,
      teacherSubjects: teacherSubjects.length,
    }),
    [
      attendance.length,
      classrooms.length,
      conduct.length,
      grades.length,
      schedules.length,
      students.length,
      subjects.length,
      teacherSubjects.length,
      teachers.length,
    ],
  );

  const attendanceStats = useMemo(() => {
    const present = attendance.filter(isPresent).length;
    const absent = attendance.filter(isAbsent).length;
    const late = attendance.filter(isLate).length;
    const total = attendance.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return { present, absent, late, total, rate };
  }, [attendance]);

  const gradeStats = useMemo(() => {
    const percentages = grades.map(getGradePercent).filter((value) => value > 0);
    const average = percentages.length
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : 0;

    return {
      total: percentages.length,
      average,
      weak: percentages.filter((value) => value < 60).length,
      excellent: percentages.filter((value) => value >= 90).length,
    };
  }, [grades]);

  const conductStats = useMemo(() => {
    const values = conduct
      .map((row) => numberValue(row, ["score"], 0))
      .filter((value) => value > 0);

    const average = values.length
      ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
      : 0;

    return {
      average,
      total: conduct.length,
      low: values.filter((value) => value < 80).length,
    };
  }, [conduct]);

  const classroomNames = useMemo(() => {
    const values = classrooms
      .map((row) => textValue(row, ["classroom_name", "class_name", "name"], ""))
      .filter(Boolean);

    return values.length > 0 ? Array.from(new Set(values)) : ["غير متوفر"];
  }, [classrooms]);

  const gradeNames = useMemo(() => {
    const values = [
      ...classrooms.map((row) => textValue(row, ["grade_name", "grade_level", "stage_name"], "")),
      ...students.map((row) => textValue(row, ["grade_name", "grade_level"], "")),
    ].filter(Boolean);

    return values.length > 0 ? Array.from(new Set(values)) : ["غير متوفر"];
  }, [classrooms, students]);

  const academicYears = useMemo(() => {
    const values = [
      ...grades.map((row) => textValue(row, ["academic_year"], "")),
      ...conduct.map((row) => textValue(row, ["academic_year"], "")),
    ].filter(Boolean);

    return values.length > 0 ? Array.from(new Set(values)) : ["غير متوفر"];
  }, [conduct, grades]);

  const semesters = useMemo(() => {
    const values = [
      ...grades.map((row) => textValue(row, ["semester"], "")),
      ...conduct.map((row) => textValue(row, ["semester"], "")),
    ].filter(Boolean);

    return values.length > 0 ? Array.from(new Set(values)) : ["غير متوفر"];
  }, [conduct, grades]);

  const executiveCards = [
    {
      title: "الطلاب",
      value: stats.students,
      subtitle: "إجمالي الطلاب المسجلين",
      icon: <Users size={24} />,
      tone: "blue" as const,
    },
    {
      title: "المعلمون",
      value: stats.teachers,
      subtitle: "إجمالي المعلمين",
      icon: <UserCog size={24} />,
      tone: "teal" as const,
    },
    {
      title: "نسبة الحضور",
      value: `${attendanceStats.rate}%`,
      subtitle: `${attendanceStats.present} حاضر — ${attendanceStats.absent} غائب — ${attendanceStats.late} متأخر`,
      icon: <CalendarCheck size={24} />,
      tone: attendanceStats.rate >= 85 ? ("green" as const) : ("gold" as const),
    },
    {
      title: "متوسط الدرجات",
      value: gradeStats.average ? `${gradeStats.average}%` : "—",
      subtitle: `${gradeStats.excellent} ممتاز — ${gradeStats.weak} يحتاج متابعة`,
      icon: <BookOpen size={24} />,
      tone: gradeStats.average >= 85 ? ("green" as const) : ("gold" as const),
    },
    {
      title: "الفصول",
      value: stats.classrooms,
      subtitle: "الفصول والشعب المفعلة",
      icon: <School size={24} />,
      tone: "blue" as const,
    },
    {
      title: "المواد",
      value: stats.subjects,
      subtitle: "المواد الدراسية المسجلة",
      icon: <FileText size={24} />,
      tone: "teal" as const,
    },
    {
      title: "السلوك والمواظبة",
      value: conductStats.average ? `${conductStats.average}%` : "—",
      subtitle: `${conductStats.total} سجل — ${conductStats.low} يحتاج متابعة`,
      icon: <ShieldCheck size={24} />,
      tone: conductStats.average >= 85 ? ("green" as const) : ("gold" as const),
    },
    {
      title: "الجداول",
      value: stats.schedules,
      subtitle: "حصص وجدولة مدرسية",
      icon: <ClipboardList size={24} />,
      tone: "blue" as const,
    },
  ];

  const barData = [
    { name: "الطلاب", value: stats.students },
    { name: "المعلمون", value: stats.teachers },
    { name: "الفصول", value: stats.classrooms },
    { name: "المواد", value: stats.subjects },
    { name: "الحضور", value: stats.attendance },
    { name: "الدرجات", value: stats.grades },
  ];

  const attendancePieData = [
    { name: "حضور", value: attendanceStats.present },
    { name: "غياب", value: attendanceStats.absent },
    { name: "تأخر", value: attendanceStats.late },
  ].filter((item) => item.value > 0);

  const trendData = [
    { name: "الحضور", value: attendanceStats.rate },
    { name: "الدرجات", value: gradeStats.average },
    { name: "السلوك", value: conductStats.average },
    { name: "الاكتمال", value: Math.min(100, Math.round(((stats.students + stats.teachers + stats.subjects + stats.classrooms) / 4) || 0)) },
  ];

  const reportGroups: ReportGroup[] = [
    {
      id: "students",
      title: "تقارير الطلاب",
      description: "الحضور والغياب والدرجات والسلوك والمتابعة الطلابية.",
      icon: <Users size={24} />,
    },
    {
      id: "academic",
      title: "التقارير الأكاديمية",
      description: "المعلمون والفصول والمواد والجداول والدرجات.",
      icon: <GraduationCap size={24} />,
    },
    {
      id: "operations",
      title: "التقارير التشغيلية",
      description: "الحضور والجداول والتكليفات والتشغيل اليومي.",
      icon: <ClipboardList size={24} />,
    },
    {
      id: "executive",
      title: "التقارير التنفيذية",
      description: "مؤشرات عامة للمدرسة وتقارير إدارية قابلة للتصدير.",
      icon: <FileBarChart size={24} />,
    },
  ];

  const reportCards: ReportCard[] = [
    {
      title: "تقرير الطلاب",
      description: "قائمة الطلاب وبياناتهم الأساسية للمتابعة والطباعة.",
      href: "/students",
      icon: <Users size={24} />,
      badge: `${stats.students} طالب`,
      color: "blue",
      exportType: "students",
      group: "students",
      keywords: ["طلاب", "students"],
    },
    {
      title: "تقرير الحضور",
      description: "مؤشرات الحضور والغياب والتأخر من سجلات الحضور.",
      href: "/attendance",
      icon: <CalendarCheck size={24} />,
      badge: `${attendanceStats.rate}% حضور`,
      color: "green",
      exportType: "attendance",
      group: "students",
      keywords: ["حضور", "غياب", "تأخر"],
    },
    {
      title: "تقرير الدرجات",
      description: "متوسطات الدرجات والمتفوقون والمتعثرون.",
      href: "/grades",
      icon: <BookOpen size={24} />,
      badge: gradeStats.average ? `${gradeStats.average}%` : "درجات",
      color: "teal",
      exportType: "grades",
      group: "students",
      keywords: ["درجات", "اختبارات"],
    },
    {
      title: "السلوك والمواظبة",
      description: "درجات السلوك والمواظبة ومؤشرات المتابعة.",
      href: "/behavior",
      icon: <ShieldCheck size={24} />,
      badge: `${stats.conduct} سجل`,
      color: "gold",
      exportType: "conduct",
      group: "students",
      keywords: ["سلوك", "مواظبة"],
    },
    {
      title: "تقرير المعلمين",
      description: "بيانات المعلمين الأساسية والتخصصات والتكليفات.",
      href: "/teachers",
      icon: <UserCog size={24} />,
      badge: `${stats.teachers} معلم`,
      color: "blue",
      exportType: "teachers",
      group: "academic",
      keywords: ["معلمين", "معلمون"],
    },
    {
      title: "تقرير الفصول",
      description: "توزيع الفصول والصفوف والشعب في المدرسة.",
      href: "/classrooms",
      icon: <School size={24} />,
      badge: `${stats.classrooms} فصل`,
      color: "teal",
      exportType: "classrooms",
      group: "academic",
      keywords: ["فصول", "صفوف"],
    },
    {
      title: "تقرير المواد",
      description: "المواد الدراسية وربطها بالصفوف والمراحل.",
      href: "/subjects",
      icon: <FileText size={24} />,
      badge: `${stats.subjects} مادة`,
      color: "gold",
      exportType: "subjects",
      group: "academic",
      keywords: ["مواد", "subjects"],
    },
    {
      title: "إسناد المعلمين",
      description: "المعلمون والمواد والفصول المسندة لهم.",
      href: "/teacher-subjects",
      icon: <GraduationCap size={24} />,
      badge: `${stats.teacherSubjects} إسناد`,
      color: "blue",
      exportType: "teacherSubjects",
      group: "academic",
      keywords: ["إسناد", "معلمين", "مواد"],
    },
    {
      title: "الجداول الدراسية",
      description: "حصص المدرسة وجدول المعلمين والفصول.",
      href: "/schedules",
      icon: <ClipboardList size={24} />,
      badge: `${stats.schedules} حصة`,
      color: "teal",
      exportType: "schedules",
      group: "operations",
      keywords: ["جداول", "حصص"],
    },
    {
      title: "تقرير الحضور التشغيلي",
      description: "تقرير سريع لحالة الحضور اليومية.",
      href: "/reports/attendance",
      icon: <CalendarCheck size={24} />,
      badge: `${stats.attendance} سجل`,
      color: "green",
      exportType: "attendance",
      group: "operations",
      keywords: ["حضور", "تشغيلي"],
    },
    {
      title: "التقرير العام",
      description: "تقرير تنفيذي موحد يجمع أهم مؤشرات المدرسة.",
      href: "/reports",
      icon: <FileBarChart size={24} />,
      badge: "تنفيذي",
      color: "slate",
      exportType: "general",
      group: "executive",
      keywords: ["عام", "تنفيذي", "إحصاءات"],
    },
    {
      title: "التحليلات",
      description: "قراءة عامة لمؤشرات الأداء المدرسي.",
      href: "/analytics",
      icon: <PieChartIcon size={24} />,
      badge: "تحليل",
      color: "teal",
      exportType: "general",
      group: "executive",
      keywords: ["تحليلات", "إحصاءات"],
    },
    {
      title: "التقارير السريعة",
      description: "تصدير سريع للبيانات الأساسية بصيغ رسمية.",
      href: "/reports",
      icon: <Sparkles size={24} />,
      badge: "سريع",
      color: "gold",
      exportType: "general",
      group: "executive",
      keywords: ["تصدير", "PDF", "Excel"],
    },
  ];

  const filteredReports = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return reportCards.filter((report) => {
      const matchesGroup = selectedGroup === "all" || report.group === selectedGroup;
      const text = [report.title, report.description, ...report.keywords].join(" ").toLowerCase();
      const matchesSearch = !keyword || text.includes(keyword);

      return matchesGroup && matchesSearch;
    });
  }, [reportCards, search, selectedGroup]);

  const latestReports = filteredReports.slice(0, 8);

  function resetFilters() {
    setSearch("");
    setSelectedGroup("all");
    setSelectedAcademicYear("all");
    setSelectedSemester("all");
    setSelectedGrade("all");
    setSelectedClassroom("all");
  }

  function getExportData(type: ExportType): ExportData {
    if (type === "students") {
      return {
        title: "تقرير الطلاب",
        headers: ["اسم الطالب", "رقم الطالب", "الصف", "الفصل"],
        rows: students.map((row) => [
          getStudentName(row),
          textValue(row, ["student_number", "national_id", "id"]),
          textValue(row, ["grade_name", "grade_level"]),
          textValue(row, ["classroom_name", "classroom", "class_name"]),
        ]),
      };
    }

    if (type === "teachers") {
      return {
        title: "تقرير المعلمين",
        headers: ["اسم المعلم", "البريد", "رقم الموظف", "التخصص"],
        rows: teachers.map((row) => [
          getTeacherName(row),
          textValue(row, ["email"]),
          textValue(row, ["employee_number", "teacher_number"]),
          textValue(row, ["specialization", "subject", "department"]),
        ]),
      };
    }

    if (type === "classrooms") {
      return {
        title: "تقرير الفصول",
        headers: ["اسم الفصل", "الصف", "المسار", "الشعبة"],
        rows: classrooms.map((row) => [
          textValue(row, ["classroom_name", "class_name", "name"]),
          textValue(row, ["grade_name", "grade_level"]),
          textValue(row, ["track_name"]),
          textValue(row, ["section"]),
        ]),
      };
    }

    if (type === "subjects") {
      return {
        title: "تقرير المواد",
        headers: ["اسم المادة", "رمز المادة", "النوع", "الحالة"],
        rows: subjects.map((row) => [
          textValue(row, ["subject_name", "name"]),
          textValue(row, ["subject_code", "code"]),
          textValue(row, ["subject_type", "type"]),
          textValue(row, ["is_active"], "نشط"),
        ]),
      };
    }

    if (type === "attendance") {
      return {
        title: "تقرير الحضور",
        headers: ["رقم الطالب", "التاريخ", "الحالة", "ملاحظات"],
        rows: attendance.map((row) => [
          textValue(row, ["student_id"]),
          textValue(row, ["attendance_date", "date", "created_at"]),
          normalizeStatus(row.attendance_status || row.status),
          textValue(row, ["notes", "note"]),
        ]),
      };
    }

    if (type === "grades") {
      return {
        title: "تقرير الدرجات",
        headers: ["رقم الطالب", "الدرجة", "الدرجة العظمى", "النسبة", "الفصل"],
        rows: grades.map((row) => [
          textValue(row, ["student_id"]),
          textValue(row, ["score", "total_score"]),
          textValue(row, ["max_score"]),
          getGradePercent(row) ? `${getGradePercent(row)}%` : "",
          textValue(row, ["semester"]),
        ]),
      };
    }

    if (type === "conduct") {
      return {
        title: "تقرير السلوك والمواظبة",
        headers: ["رقم الطالب", "النوع", "الدرجة", "الدرجة العظمى", "الفصل"],
        rows: conduct.map((row) => [
          textValue(row, ["student_id"]),
          textValue(row, ["score_type", "type"]),
          textValue(row, ["score"]),
          textValue(row, ["max_score"]),
          textValue(row, ["semester"]),
        ]),
      };
    }

    if (type === "schedules") {
      return {
        title: "تقرير الجداول",
        headers: ["اليوم", "الحصة", "البداية", "النهاية", "الغرفة"],
        rows: schedules.map((row) => [
          textValue(row, ["day_name"]),
          textValue(row, ["period_number"]),
          textValue(row, ["start_time"]),
          textValue(row, ["end_time"]),
          textValue(row, ["room_name"]),
        ]),
      };
    }

    if (type === "teacherSubjects") {
      return {
        title: "تقرير إسناد المعلمين",
        headers: ["المعلم", "المادة", "الفصل", "العام", "الفصل الدراسي"],
        rows: teacherSubjects.map((row) => [
          textValue(row, ["teacher_id"]),
          textValue(row, ["subject_id"]),
          textValue(row, ["classroom_id"]),
          textValue(row, ["academic_year"]),
          textValue(row, ["semester"]),
        ]),
      };
    }

    return {
      title: "التقرير العام للمدرسة",
      headers: ["المؤشر", "القيمة"],
      rows: [
        ["المدرسة", currentSchool?.school_name || "غير متوفر"],
        ["إجمالي الطلاب", stats.students],
        ["إجمالي المعلمين", stats.teachers],
        ["إجمالي الفصول", stats.classrooms],
        ["إجمالي المواد", stats.subjects],
        ["إجمالي سجلات الحضور", stats.attendance],
        ["نسبة الحضور", `${attendanceStats.rate}%`],
        ["متوسط الدرجات", gradeStats.average ? `${gradeStats.average}%` : "—"],
        ["درجات ممتازة", gradeStats.excellent],
        ["درجات تحتاج متابعة", gradeStats.weak],
        ["متوسط السلوك والمواظبة", conductStats.average ? `${conductStats.average}%` : "—"],
        ["إجمالي الجداول", stats.schedules],
        ["إسنادات المعلمين", stats.teacherSubjects],
        ["آخر تحديث", lastUpdate],
      ],
    };
  }

  function exportPDF(type: ExportType) {
    const data = getExportData(type);

    (exportTableToPDF as any)({
      title: data.title,
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "تقرير صادر من مركز التقارير",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.pdf`,
    });

    showToast("success", `تم تصدير ${data.title} PDF`);
  }

  function exportExcel(type: ExportType) {
    const data = getExportData(type);

    (exportTableToExcel as any)({
      title: data.title,
      schoolName: currentSchool?.school_name || "منصة المدرسة الذكية",
      subtitle: "تقرير صادر من مركز التقارير",
      headers: data.headers,
      rows: data.rows,
      fileName: `${data.title}.xlsx`,
      sheetName: "Reports",
    });

    showToast("success", `تم تصدير ${data.title} Excel`);
  }

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={REPORT_ROLES}>
        <AppShell>
          <PageLoader text="جاري تحميل مركز التقارير..." />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={REPORT_ROLES}>
      <AppShell>
        <main className="space-y-6 pb-10" dir="rtl">
          {toast && (
            <div className="fixed left-5 top-5 z-50 w-[min(420px,calc(100%-2rem))] print:hidden">
              {toast.type === "success" ? (
                <SuccessBanner description={toast.message} />
              ) : (
                <ErrorState description={toast.message} />
              )}
            </div>
          )}

          <PageHeader
            variant="hero"
            title="مركز التقارير"
            description="مركز تنفيذي موحد للتقارير المدرسية يجمع البيانات التشغيلية والتحليلات ومؤشرات الأداء، مع تصدير رسمي PDF وExcel وقراءة سريعة لجودة البيانات."
            badge="مركز التقارير المدرسية"
            icon={<FileBarChart size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "التقارير" },
            ]}
            meta={[
              { label: "المدرسة", value: currentSchool?.school_name || "غير متوفر" },
              { label: "آخر تحديث", value: lastUpdate },
              { label: "السنة الدراسية", value: selectedAcademicYear === "all" ? "الكل" : selectedAcademicYear },
              { label: "الفصل الدراسي", value: selectedSemester === "all" ? "الكل" : selectedSemester },
            ]}
            stats={[
              { label: "الطلاب", value: stats.students, icon: <Users size={20} />, tone: "blue" },
              { label: "المعلمون", value: stats.teachers, icon: <UserCog size={20} />, tone: "teal" },
              { label: "نسبة الحضور", value: `${attendanceStats.rate}%`, icon: <CalendarCheck size={20} />, tone: attendanceStats.rate >= 85 ? "green" : "gold" },
              { label: "متوسط الدرجات", value: gradeStats.average ? `${gradeStats.average}%` : "—", icon: <BookOpen size={20} />, tone: gradeStats.average >= 85 ? "green" : "gold" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void fetchReportsData()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Printer size={17} />
                  طباعة
                </button>

                <button
                  type="button"
                  onClick={() => exportPDF("general")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileText size={17} />
                  PDF عام
                </button>

                <button
                  type="button"
                  onClick={() => exportExcel("general")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FileSpreadsheet size={17} />
                  Excel عام
                </button>
              </>
            }
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {executiveCards.map((item) => (
              <SharedExecutiveCard key={item.title} {...item} />
            ))}
          </section>

          <SummaryCard
            title="الملخص التنفيذي للتقارير"
            description="قراءة سريعة لجاهزية بيانات المدرسة ومؤشرات التقارير الأساسية قبل التصدير أو الطباعة."
            tone={stats.students > 0 && stats.teachers > 0 ? "green" : "gold"}
            items={[
              { label: "الطلاب", value: stats.students },
              { label: "المعلمون", value: stats.teachers },
              { label: "الفصول", value: stats.classrooms },
              { label: "المواد", value: stats.subjects },
              { label: "سجلات الحضور", value: stats.attendance },
              { label: "إسنادات المعلمين", value: stats.teacherSubjects },
            ]}
            footer="تزيد جودة التقارير كلما اكتملت بيانات الطلاب والمعلمين والفصول والحضور والدرجات داخل المنصة."
          />

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-2xl bg-[#15445A]/10 p-2 text-[#15445A]">
                  <TrendingUp size={20} />
                </div>
                <h2 className="font-black text-[#15445A]">الملخص التنفيذي</h2>
              </div>

              <p className="text-sm leading-7 text-slate-600">
                تعرض الصفحة صورة مختصرة عن حالة المدرسة من خلال مؤشرات الطلاب، المعلمين،
                الحضور، الدرجات، السلوك، الجداول وإسناد المعلمين. يمكن استخدام الأزرار
                السريعة لاستخراج تقرير تنفيذي أو تصدير كل تقرير بصيغة PDF أو Excel.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <MiniInsight label="أعلى مؤشر" value={attendanceStats.rate >= gradeStats.average ? "الحضور" : "الدرجات"} />
                <MiniInsight label="يحتاج متابعة" value={gradeStats.weak > 0 ? "الدرجات" : conductStats.low > 0 ? "السلوك" : "لا يوجد"} />
                <MiniInsight label="جودة البيانات" value={stats.students > 0 ? "نشطة" : "تحتاج إدخال"} />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-2xl bg-[#0DA9A6]/10 p-2 text-[#0DA9A6]">
                  <CheckCircle2 size={20} />
                </div>
                <h2 className="font-black text-[#15445A]">جاهزية التقارير</h2>
              </div>

              <div className="space-y-4">
                <ProgressMetric label="بيانات الطلاب" value={stats.students > 0 ? 100 : 0} />
                <ProgressMetric label="بيانات المعلمين" value={stats.teachers > 0 ? 100 : 0} />
                <ProgressMetric label="الحضور والدرجات" value={Math.round(((stats.attendance > 0 ? 50 : 0) + (stats.grades > 0 ? 50 : 0)))} />
              </div>
            </div>
          </section>

          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "ابحث عن تقرير، حضور، درجات، طلاب، معلمين...",
            }}
            filters={
              <>
                <ToolbarSelect value={selectedGroup} onChange={(value) => setSelectedGroup(value as typeof selectedGroup)}>
                  <option value="all">كل التقارير</option>
                  <option value="students">تقارير الطلاب</option>
                  <option value="academic">التقارير الأكاديمية</option>
                  <option value="operations">التقارير التشغيلية</option>
                  <option value="executive">التقارير التنفيذية</option>
                </ToolbarSelect>

                <ToolbarSelect value={selectedAcademicYear} onChange={setSelectedAcademicYear}>
                  <option value="all">كل السنوات</option>
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect value={selectedSemester} onChange={setSelectedSemester}>
                  <option value="all">كل الفصول الدراسية</option>
                  {semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </ToolbarSelect>
              </>
            }
            onRefresh={() => void fetchReportsData()}
            onExportExcel={() => exportExcel("general")}
            onExportPDF={() => exportPDF("general")}
            onPrint={() => window.print()}
          />

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#15445A]">فلاتر متقدمة</h2>
                <p className="mt-1 text-sm text-slate-500">
                  استخدم هذه الفلاتر عند تجهيز تقارير مخصصة لمرحلة أو فصل محدد.
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-200"
              >
                <X size={16} />
                تصفير الفلاتر
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ToolbarSelect value={selectedGrade} onChange={setSelectedGrade}>
                <option value="all">كل المراحل / الصفوف</option>
                {gradeNames.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </ToolbarSelect>

              <ToolbarSelect value={selectedClassroom} onChange={setSelectedClassroom}>
                <option value="all">كل الفصول</option>
                {classroomNames.map((classroom) => (
                  <option key={classroom} value={classroom}>
                    {classroom}
                  </option>
                ))}
              </ToolbarSelect>

              <ToolbarSelect value="all" onChange={() => undefined}>
                <option>نوع التقرير</option>
                <option>تشغيلي</option>
                <option>تنفيذي</option>
                <option>إحصائي</option>
              </ToolbarSelect>
            </div>
          </section>

          <section className="flex flex-wrap gap-3 print:hidden">
            <QuickAction icon={<RefreshCcw size={17} />} label="تحديث البيانات" onClick={() => void fetchReportsData()} />
            <QuickAction icon={<Printer size={17} />} label="طباعة الصفحة" onClick={() => window.print()} />
            <QuickAction icon={<FileText size={17} />} label="PDF عام" onClick={() => exportPDF("general")} primary />
            <QuickAction icon={<FileSpreadsheet size={17} />} label="Excel عام" onClick={() => exportExcel("general")} />
            <QuickAction icon={<Download size={17} />} label="تصدير الطلاب" onClick={() => exportExcel("students")} />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <ChartCard title="مؤشرات تشغيلية" icon={<BarChart3 size={20} />}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]} fill={BRAND.teal} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="توزيع الحضور" icon={<PieChartIcon size={20} />}>
              {attendancePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={attendancePieData} dataKey="value" nameKey="name" outerRadius={92} label>
                      {attendancePieData.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </ChartCard>

            <ChartCard title="المؤشر التنفيذي" icon={<LineChartIcon size={20} />}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={BRAND.primary} strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </section>

          <section className="space-y-5">
            {reportGroups
              .filter((group) => selectedGroup === "all" || group.id === selectedGroup)
              .map((group) => {
                const reports = filteredReports.filter((report) => report.group === group.id);

                if (reports.length === 0) return null;

                return (
                  <ReportGroupCard
                    key={group.id}
                    group={group}
                    reports={reports}
                    onPDF={exportPDF}
                    onExcel={exportExcel}
                  />
                );
              })}
          </section>

          {filteredReports.length === 0 && (
            <UiEmptyState
              icon={<Search className="h-8 w-8" />}
              title="لا توجد تقارير مطابقة"
              description="جرّب تغيير كلمات البحث أو نوع التقرير أو تصفير الفلاتر."
            />
          )}

          <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-black text-[#15445A]">آخر التقارير</h2>
                <p className="mt-1 text-sm text-slate-500">
                  ملخص سريع للتقارير المتاحة حسب الفلاتر الحالية.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
                {latestReports.length} تقارير ظاهرة
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full min-w-[760px] text-right text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4">اسم التقرير</th>
                    <th className="p-4">المجال</th>
                    <th className="p-4">آخر تحديث</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">إجراءات</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {latestReports.map((report) => (
                    <tr key={`${report.group}-${report.title}`} className="hover:bg-slate-50">
                      <td className="p-4 font-black text-[#15445A]">{report.title}</td>
                      <td className="p-4 text-slate-500">{groupLabel(report.group)}</td>
                      <td className="p-4 text-slate-500">{lastUpdate}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#07A869]/10 px-3 py-1 text-xs font-bold text-[#07A869]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          جاهز
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <Link href={report.href} className="rounded-xl bg-[#15445A] px-3 py-2 text-xs font-bold text-white">
                            عرض
                          </Link>
                          <button
                            type="button"
                            onClick={() => exportPDF(report.exportType)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => exportExcel(report.exportType)}
                            className="rounded-xl bg-[#07A869]/10 px-3 py-2 text-xs font-bold text-[#07A869]"
                          >
                            Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {latestReports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        لا توجد تقارير مطابقة للفلاتر الحالية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function groupLabel(group: ReportCard["group"]) {
  if (group === "students") return "تقارير الطلاب";
  if (group === "academic") return "التقارير الأكاديمية";
  if (group === "operations") return "التقارير التشغيلية";
  return "التقارير التنفيذية";
}

function QuickAction({
  icon,
  label,
  onClick,
  primary,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        primary ? "bg-[#15445A] text-white" : "border border-slate-100 bg-white text-[#15445A]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ChartCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-2xl bg-[#0DA9A6]/10 p-2 text-[#0DA9A6]">{icon}</div>
        <h2 className="font-black text-[#15445A]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function NoChartData() {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-[24px] bg-slate-50 text-center">
      <div>
        <PieChartIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">لا توجد بيانات كافية للرسم البياني</p>
      </div>
    </div>
  );
}

function ReportGroupCard({
  group,
  reports,
  onPDF,
  onExcel,
}: {
  group: ReportGroup;
  reports: ReportCard[];
  onPDF: (type: ExportType) => void;
  onExcel: (type: ExportType) => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#15445A]/10 text-[#15445A]">
            {group.icon}
          </div>

          <div>
            <h2 className="text-2xl font-black text-[#15445A]">{group.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{group.description}</p>
          </div>
        </div>

        <span className="w-fit rounded-full bg-slate-50 px-4 py-2 text-xs font-black text-slate-500">
          {reports.length} تقارير
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportLinkCard
            key={`${report.group}-${report.title}`}
            report={report}
            onPDF={onPDF}
            onExcel={onExcel}
          />
        ))}
      </div>
    </section>
  );
}

function ReportLinkCard({
  report,
  onPDF,
  onExcel,
}: {
  report: ReportCard;
  onPDF: (type: ExportType) => void;
  onExcel: (type: ExportType) => void;
}) {
  const colors = {
    blue: "bg-[#3D7EB9]/10 text-[#3D7EB9]",
    green: "bg-[#07A869]/10 text-[#07A869]",
    teal: "bg-[#0DA9A6]/10 text-[#0DA9A6]",
    gold: "bg-[#C1B489]/20 text-[#15445A]",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:-translate-y-1 hover:bg-white hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors[report.color]}`}>
          {report.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h3 className="font-black text-[#15445A]">{report.title}</h3>
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
              {report.badge}
            </span>
          </div>

          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{report.description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={report.href}
              className="inline-flex items-center gap-1 rounded-xl bg-[#15445A] px-3 py-2 text-xs font-bold text-white hover:bg-[#0DA9A6]"
            >
              <Eye size={14} />
              عرض
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              <Printer size={14} />
              طباعة
            </button>

            <button
              type="button"
              onClick={() => onPDF(report.exportType)}
              className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
            >
              <FileText size={14} />
              PDF
            </button>

            <button
              type="button"
              onClick={() => onExcel(report.exportType)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#07A869]/10 px-3 py-2 text-xs font-bold text-[#07A869] hover:bg-emerald-100"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function MiniInsight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black text-[#15445A]">{value}</p>
    </div>
  );
}

function ProgressMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-black">
        <span className="text-slate-500">{label}</span>
        <span className="text-[#15445A]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#0DA9A6]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

