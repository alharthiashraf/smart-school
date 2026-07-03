"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import AppShell from "@/components/layout/AppShell";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import RoleGuard from "@/components/auth/RoleGuard";
import { ADMIN_ROLES } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { useSchool } from "@/contexts/SchoolContext";

import {
  AlertCircle,
  Bell,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  Image,
  Loader2,
  Palette,
  PlusCircle,
  RefreshCcw,
  Save,
  School,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
} from "lucide-react";

type Tab =
  | "school"
  | "identity"
  | "academic"
  | "classes"
  | "subjects"
  | "users"
  | "imports"
  | "notifications"
  | "permissions"
  | "readiness";

type SchoolType = "boys" | "girls" | "mixed";
type SchoolStage = "ابتدائي" | "متوسط" | "ثانوي" | "مجمع";
type Semester = "الفصل الدراسي الأول" | "الفصل الدراسي الثاني" | "الفصل الدراسي الثالث";
type SemesterSystem = "فصلين" | "ثلاثة فصول";
type ImportType = "students" | "teachers" | "subjects" | "classes" | "schedule";

type SchoolSettings = {
  id?: string;
  school_id?: string | null;
  school_name: string;
  school_code: string;
  school_type: SchoolType;
  school_stage: SchoolStage;
  city: string;
  education_department: string;
  principal_name: string;
  phone: string;
  email: string;
  address: string;
  logo_url: string;
  platform_name: string;
  primary_color: string;
  secondary_color: string;
  academic_year: string;
  semester: Semester;
  semester_system: SemesterSystem;
  year_start_date: string;
  year_end_date: string;
  enable_notifications: boolean;
  notify_absence: boolean;
  notify_late: boolean;
  notify_weak_grades: boolean;
  notify_waiting_periods: boolean;
  allow_teacher_edit_grades: boolean;
  allow_teacher_attendance: boolean;
  allow_vice_behavior_edit: boolean;
  allow_admin_student_edit: boolean;
};

type SubjectRow = {
  id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  grade_level?: string | null;
};

type ClassRow = {
  id: string;
  class_name?: string | null;
  classroom_name?: string | null;
  name?: string | null;
  grade_level?: string | null;
  grade_name?: string | null;
  section?: string | null;
};

type SettingsStats = {
  students: number;
  teachers: number;
  users: number;
  subjects: number;
  classes: number;
  admins: number;
  vicePrincipals: number;
  administrativeStaff: number;
  counselors: number;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

type QueryLike<T> = PromiseLike<QueryResult<T>>;

type ImportPreview = Record<string, unknown>;

const EMPTY_SETTINGS: SchoolSettings = {
  school_name: "",
  school_code: "",
  school_type: "boys",
  school_stage: "ثانوي",
  city: "",
  education_department: "",
  principal_name: "",
  phone: "",
  email: "",
  address: "",
  logo_url: "",
  platform_name: "منصة المدرسة الذكية",
  primary_color: "#15445A",
  secondary_color: "#C1B489",
  academic_year: "1447",
  semester: "الفصل الدراسي الأول",
  semester_system: "ثلاثة فصول",
  year_start_date: "",
  year_end_date: "",
  enable_notifications: true,
  notify_absence: true,
  notify_late: true,
  notify_weak_grades: true,
  notify_waiting_periods: true,
  allow_teacher_edit_grades: true,
  allow_teacher_attendance: true,
  allow_vice_behavior_edit: true,
  allow_admin_student_edit: true,
};

const EMPTY_STATS: SettingsStats = {
  students: 0,
  teachers: 0,
  users: 0,
  subjects: 0,
  classes: 0,
  admins: 0,
  vicePrincipals: 0,
  administrativeStaff: 0,
  counselors: 0,
};

const TABS: { id: Tab; title: string; icon: ReactNode }[] = [
  { id: "school", title: "بيانات المدرسة", icon: <School size={20} /> },
  { id: "identity", title: "الهوية", icon: <Image size={20} /> },
  { id: "academic", title: "العام الدراسي", icon: <Building2 size={20} /> },
  { id: "classes", title: "الفصول", icon: <Building2 size={20} /> },
  { id: "subjects", title: "المواد", icon: <BookOpenCheck size={20} /> },
  { id: "users", title: "المستخدمون", icon: <Users size={20} /> },
  { id: "imports", title: "الاستيراد", icon: <FileSpreadsheet size={20} /> },
  { id: "notifications", title: "الإشعارات", icon: <Bell size={20} /> },
  { id: "permissions", title: "الصلاحيات", icon: <ShieldCheck size={20} /> },
  { id: "readiness", title: "الجاهزية", icon: <CheckCircle2 size={20} /> },
];

const IMPORT_LABELS: Record<ImportType, string> = {
  students: "استيراد الطلاب",
  teachers: "استيراد المعلمين",
  subjects: "استيراد المواد",
  classes: "استيراد الفصول",
  schedule: "استيراد الجدول الدراسي",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

async function safeQuery<T>(
  query: QueryLike<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    const result = await query;

    if (result.error) {
      console.warn(`settings query skipped: ${label}`, result.error);
      return fallback;
    }

    return result.data ?? fallback;
  } catch (error) {
    console.warn(`settings query failed: ${label}`, error);
    return fallback;
  }
}

function normalizeKey(key: string) {
  return String(key || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "")
    .toLowerCase();
}

function getCell(row: ImportPreview, keys: string[]) {
  const normalizedRow: Record<string, unknown> = {};

  Object.keys(row).forEach((key) => {
    normalizedRow[normalizeKey(key)] = row[key];
  });

  for (const key of keys) {
    const value = normalizedRow[normalizeKey(key)];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function classTitle(item: ClassRow) {
  return item.classroom_name || item.class_name || item.name || "فصل بدون اسم";
}

export default function SettingsPage() {
  const { currentSchool, loading: schoolLoading, refreshSchools } = useSchool();

  const [activeTab, setActiveTab] = useState<Tab>("school");
  const [settings, setSettings] = useState<SchoolSettings>(EMPTY_SETTINGS);
  const [stats, setStats] = useState<SettingsStats>(EMPTY_STATS);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [newSubject, setNewSubject] = useState({
    subject_name: "",
    subject_code: "",
    grade_level: "",
  });

  const [newClass, setNewClass] = useState({
    class_name: "",
    grade_level: "",
    section: "",
  });

  const [importType, setImportType] = useState<ImportType>("subjects");
  const [importRows, setImportRows] = useState<ImportPreview[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const schoolId = currentSchool?.id || null;

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  async function countRows(table: string, role?: string) {
    if (!schoolId) return 0;

    try {
      let query = supabase.from(table).select("id", { count: "exact", head: true });

      if (table !== "teacher_evidence_types") {
        query = query.eq("school_id", schoolId);
      }

      if (role) {
        query = query.eq("role", role);
      }

      const { count, error } = await query;

      if (error) return 0;

      return count ?? 0;
    } catch {
      return 0;
    }
  }

  const fetchSettings = useCallback(async () => {
    if (!schoolId) return;

    const data = await safeQuery<any | null>(
      supabase
        .from("settings")
        .select("*")
        .eq("school_id", schoolId)
        .limit(1)
        .maybeSingle(),
      null,
      "settings",
    );

    if (!data) {
      setSettings({
        ...EMPTY_SETTINGS,
        school_id: schoolId,
        school_name: currentSchool?.school_name || "",
        logo_url: currentSchool?.logo_url || "",
        city: currentSchool?.city || "",
        semester_system:
          currentSchool?.semester_system === "فصلين"
            ? "فصلين"
            : "ثلاثة فصول",
      });
      return;
    }

    setSettings({
      ...EMPTY_SETTINGS,
      id: data.id,
      school_id: data.school_id || schoolId,
      school_name: data.school_name || currentSchool?.school_name || "",
      school_code: data.school_code || "",
      school_type: data.school_type || "boys",
      school_stage: data.school_stage || "ثانوي",
      city: data.city || currentSchool?.city || "",
      education_department: data.education_department || "",
      principal_name: data.principal_name || "",
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      logo_url: data.logo_url || currentSchool?.logo_url || "",
      platform_name: data.platform_name || "منصة المدرسة الذكية",
      primary_color: data.primary_color || "#15445A",
      secondary_color: data.secondary_color || "#C1B489",
      academic_year: data.academic_year || "1447",
      semester: data.semester || "الفصل الدراسي الأول",
      semester_system:
        data.semester_system || data.term_system || currentSchool?.semester_system || "ثلاثة فصول",
      year_start_date: data.year_start_date || "",
      year_end_date: data.year_end_date || "",
      enable_notifications: data.enable_notifications ?? true,
      notify_absence: data.notify_absence ?? true,
      notify_late: data.notify_late ?? true,
      notify_weak_grades: data.notify_weak_grades ?? true,
      notify_waiting_periods: data.notify_waiting_periods ?? true,
      allow_teacher_edit_grades: data.allow_teacher_edit_grades ?? true,
      allow_teacher_attendance: data.allow_teacher_attendance ?? true,
      allow_vice_behavior_edit: data.allow_vice_behavior_edit ?? true,
      allow_admin_student_edit: data.allow_admin_student_edit ?? true,
    });
  }, [currentSchool, schoolId]);

  const fetchStats = useCallback(async () => {
    if (!schoolId) return;

    const [
      students,
      teachers,
      users,
      subjectsCount,
      classesCount,
      admins,
      vicePrincipals,
      administrativeStaff,
      counselors,
    ] = await Promise.all([
      countRows("students"),
      countRows("teachers"),
      countRows("school_members"),
      countRows("subjects"),
      countRows("classes"),
      countRows("school_members", "school_admin"),
      countRows("school_members", "vice_principal"),
      countRows("school_members", "administrative_staff"),
      countRows("school_members", "student_counselor"),
    ]);

    setStats({
      students,
      teachers,
      users,
      subjects: subjectsCount,
      classes: classesCount,
      admins,
      vicePrincipals,
      administrativeStaff,
      counselors,
    });
  }, [schoolId]);

  const fetchSubjects = useCallback(async () => {
    if (!schoolId) return;

    const data = await safeQuery<SubjectRow[]>(
      supabase
        .from("subjects")
        .select("id, subject_name, subject_code, grade_level")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      [],
      "subjects",
    );

    setSubjects(data);
  }, [schoolId]);

  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;

    const data = await safeQuery<ClassRow[]>(
      supabase
        .from("classes")
        .select("id, class_name, classroom_name, name, grade_level, grade_name, section")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      [],
      "classes",
    );

    setClasses(data);
  }, [schoolId]);

  const fetchAll = useCallback(async () => {
    if (!schoolId) {
      setErrorMsg("لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await Promise.all([
        fetchSettings(),
        fetchStats(),
        fetchSubjects(),
        fetchClasses(),
      ]);
    } catch (error) {
      const message = getErrorMessage(error, "تعذر تحميل الإعدادات.");
      setErrorMsg(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [fetchClasses, fetchSettings, fetchStats, fetchSubjects, schoolId, showToast]);

  useEffect(() => {
    if (schoolLoading) return;

    queueMicrotask(() => {
      void fetchAll();
    });
  }, [fetchAll, schoolLoading]);

  async function uploadSchoolLogo(file: File) {
    if (!schoolId) return;

    setUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${schoolId}/school-logo-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("school-assets")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("school-assets")
        .getPublicUrl(fileName);

      setSettings((prev) => ({
        ...prev,
        logo_url: data.publicUrl,
      }));

      showToast("success", "تم رفع الشعار بنجاح.");
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر رفع الشعار."));
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveSettings() {
    if (!schoolId) return;

    setSaving(true);

    try {
      const payload = {
        school_id: schoolId,
        school_name: settings.school_name,
        school_code: settings.school_code,
        school_type: settings.school_type,
        school_stage: settings.school_stage,
        city: settings.city,
        education_department: settings.education_department,
        principal_name: settings.principal_name,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        logo_url: settings.logo_url,
        platform_name: settings.platform_name,
        primary_color: settings.primary_color,
        secondary_color: settings.secondary_color,
        academic_year: settings.academic_year,
        semester: settings.semester,
        semester_system: settings.semester_system,
        term_system: settings.semester_system,
        year_start_date: settings.year_start_date || null,
        year_end_date: settings.year_end_date || null,
        enable_notifications: settings.enable_notifications,
        notify_absence: settings.notify_absence,
        notify_late: settings.notify_late,
        notify_weak_grades: settings.notify_weak_grades,
        notify_waiting_periods: settings.notify_waiting_periods,
        allow_teacher_edit_grades: settings.allow_teacher_edit_grades,
        allow_teacher_attendance: settings.allow_teacher_attendance,
        allow_vice_behavior_edit: settings.allow_vice_behavior_edit,
        allow_admin_student_edit: settings.allow_admin_student_edit,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = settings.id
        ? await supabase
            .from("settings")
            .update(payload)
            .eq("id", settings.id)
            .select()
            .single()
        : await supabase.from("settings").insert(payload).select().single();

      if (error) throw error;

      if (settings.school_name || settings.logo_url || settings.city) {
        await supabase
          .from("schools")
          .update({
            school_name: settings.school_name || currentSchool?.school_name,
            logo_url: settings.logo_url || null,
            city: settings.city || null,
            semester_system: settings.semester_system,
          })
          .eq("id", schoolId);
      }

      if (data?.id) {
        setSettings((prev) => ({ ...prev, id: data.id }));
      }

      await refreshSchools();
      await fetchSettings();
      showToast("success", "تم حفظ الإعدادات بنجاح.");
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر حفظ الإعدادات."));
    } finally {
      setSaving(false);
    }
  }

  async function addSubject() {
    if (!schoolId) return;

    if (!newSubject.subject_name.trim()) {
      showToast("error", "اكتب اسم المادة.");
      return;
    }

    const { error } = await supabase.from("subjects").insert({
      subject_name: newSubject.subject_name.trim(),
      subject_code: newSubject.subject_code.trim() || null,
      grade_level: newSubject.grade_level.trim() || null,
      school_id: schoolId,
    });

    if (error) {
      showToast("error", error.message);
      return;
    }

    setNewSubject({ subject_name: "", subject_code: "", grade_level: "" });
    await Promise.all([fetchSubjects(), fetchStats()]);
    showToast("success", "تمت إضافة المادة.");
  }

  async function deleteSubject(id: string) {
    if (!confirm("هل تريد حذف المادة؟")) return;

    const { error } = await supabase.from("subjects").delete().eq("id", id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    await Promise.all([fetchSubjects(), fetchStats()]);
    showToast("success", "تم حذف المادة.");
  }

  async function addClass() {
    if (!schoolId) return;

    if (!newClass.class_name.trim()) {
      showToast("error", "اكتب اسم الفصل.");
      return;
    }

    const { error } = await supabase.from("classes").insert({
      class_name: newClass.class_name.trim(),
      classroom_name: newClass.class_name.trim(),
      grade_level: newClass.grade_level.trim() || null,
      section: newClass.section.trim() || null,
      school_id: schoolId,
    });

    if (error) {
      showToast("error", error.message);
      return;
    }

    setNewClass({ class_name: "", grade_level: "", section: "" });
    await Promise.all([fetchClasses(), fetchStats()]);
    showToast("success", "تمت إضافة الفصل.");
  }

  async function deleteClass(id: string) {
    if (!confirm("هل تريد حذف الفصل؟")) return;

    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      showToast("error", error.message);
      return;
    }

    await Promise.all([fetchClasses(), fetchStats()]);
    showToast("success", "تم حذف الفصل.");
  }

  async function handleImportFile(file: File) {
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<ImportPreview>(sheet, {
        defval: "",
      });

      setImportRows(rows.slice(0, 5000));

      if (rows.length === 0) {
        showToast("error", "الملف فارغ أو غير مقروء.");
      } else {
        showToast("success", `تمت قراءة ${rows.length} صف.`);
      }
    } catch {
      showToast("error", "تعذر قراءة الملف. تأكد أنه Excel أو CSV وأن مكتبة xlsx مثبتة.");
    }
  }

  async function executeImport() {
    if (!schoolId) return;

    if (importRows.length === 0) {
      showToast("error", "ارفع ملفًا أولًا.");
      return;
    }

    setImporting(true);

    try {
      if (importType === "subjects") await importSubjects();
      if (importType === "classes") await importClasses();
      if (importType === "students") await importStudents();
      if (importType === "teachers") await importTeachers();
      if (importType === "schedule") await importSchedule();

      setImportRows([]);
      await fetchAll();
      showToast("success", "تم الاستيراد بنجاح.");
    } catch (error) {
      showToast("error", getErrorMessage(error, "تعذر الاستيراد."));
    } finally {
      setImporting(false);
    }
  }

  async function importSubjects() {
    const rows = importRows
      .map((row) => ({
        subject_name: getCell(row, ["subject_name", "subject", "المادة", "اسم_المادة", "اسم المادة"]),
        subject_code: getCell(row, ["subject_code", "code", "رمز_المادة", "رمز المادة"]) || null,
        grade_level: getCell(row, ["grade_level", "grade", "الصف", "المرحلة"]) || null,
        school_id: schoolId,
      }))
      .filter((row) => row.subject_name);

    if (rows.length) {
      const { error } = await supabase.from("subjects").insert(rows);
      if (error) throw error;
    }
  }

  async function importClasses() {
    const rows = importRows
      .map((row) => ({
        class_name: getCell(row, ["class_name", "class", "الفصل", "اسم_الفصل", "اسم الفصل"]),
        classroom_name: getCell(row, ["classroom_name", "class_name", "class", "الفصل", "اسم_الفصل", "اسم الفصل"]),
        grade_level: getCell(row, ["grade_level", "grade", "الصف", "المرحلة"]) || null,
        section: getCell(row, ["section", "الشعبة", "القسم"]) || null,
        school_id: schoolId,
      }))
      .filter((row) => row.class_name);

    if (rows.length) {
      const { error } = await supabase.from("classes").insert(rows);
      if (error) throw error;
    }
  }

  async function importTeachers() {
    const rows = importRows
      .map((row) => ({
        full_name: getCell(row, ["full_name", "teacher_name", "name", "اسم_المعلم", "اسم المعلم", "المعلم"]),
        subject: getCell(row, ["subject", "المادة"]) || null,
        department: getCell(row, ["department", "القسم", "التخصص"]) || null,
        phone: getCell(row, ["phone", "mobile", "الجوال"]) || null,
        email: getCell(row, ["email", "البريد"]) || null,
        status: "على رأس العمل",
        school_id: schoolId,
      }))
      .filter((row) => row.full_name);

    if (rows.length) {
      const { error } = await supabase.from("teachers").insert(rows);
      if (error) throw error;
    }
  }

  async function importStudents() {
    const rows = importRows
      .map((row) => ({
        full_name: getCell(row, ["full_name", "student_name", "name", "اسم_الطالب", "اسم الطالب", "الطالب"]),
        national_id: getCell(row, ["national_id", "id_number", "السجل_المدني", "رقم_الهوية", "رقم الهوية"]) || null,
        student_number: getCell(row, ["student_number", "student_id", "رقم_الطالب", "رقم الطالب"]) || null,
        grade_level: getCell(row, ["grade_level", "grade", "الصف", "المرحلة"]) || null,
        classroom: getCell(row, ["classroom", "class", "الفصل"]) || null,
        class_name: getCell(row, ["class_name", "class", "الفصل"]) || null,
        section: getCell(row, ["section", "الشعبة", "الفصل"]) || null,
        phone: getCell(row, ["phone", "mobile", "الجوال"]) || null,
        guardian_name: getCell(row, ["guardian_name", "ولي_الأمر", "ولي الأمر"]) || null,
        guardian_phone: getCell(row, ["guardian_phone", "جوال_ولي_الأمر", "جوال ولي الأمر"]) || null,
        guardian_email: getCell(row, ["guardian_email", "بريد_ولي_الأمر", "بريد ولي الأمر"]) || null,
        status: "active",
        school_id: schoolId,
      }))
      .filter((row) => row.full_name);

    if (rows.length) {
      const { error } = await supabase.from("students").insert(rows);
      if (error) throw error;
    }
  }

  async function importSchedule() {
    const rows = importRows
      .map((row) => ({
        day_name: getCell(row, ["day_name", "day", "اليوم"]),
        period_number: Number(getCell(row, ["period_number", "period", "الحصة"])) || 1,
        class_name: getCell(row, ["class_name", "class", "الفصل"]),
        section: getCell(row, ["section", "الشعبة", "القسم"]) || null,
        subject: getCell(row, ["subject", "subject_name", "المادة"]),
        school_id: schoolId,
      }))
      .filter((row) => row.day_name && row.class_name && row.subject);

    if (rows.length) {
      const { error } = await supabase.from("teacher_schedule").insert(rows);
      if (error) throw error;
    }
  }

  const readinessItems = useMemo(() => {
    return [
      { title: "اسم المدرسة محفوظ", done: Boolean(settings.school_name) },
      { title: "رمز المدرسة محفوظ", done: Boolean(settings.school_code) },
      { title: "الشعار مرفوع", done: Boolean(settings.logo_url) },
      { title: "العام الدراسي محدد", done: Boolean(settings.academic_year) },
      { title: "نظام الفصول محدد", done: Boolean(settings.semester_system) },
      { title: "يوجد طلاب", done: stats.students > 0 },
      { title: "يوجد معلمون", done: stats.teachers > 0 },
      { title: "يوجد مستخدمون", done: stats.users > 0 },
      { title: "يوجد فصول", done: stats.classes > 0 },
      { title: "يوجد مواد", done: stats.subjects > 0 },
    ];
  }, [settings, stats]);

  const readinessPercent = Math.round(
    (readinessItems.filter((item) => item.done).length /
      readinessItems.length) *
      100,
  );

  if (schoolLoading || loading) {
    return (
      <RoleGuard allowedRoles={ADMIN_ROLES}>
        <AppShell>
          <LoadingBox />
        </AppShell>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={ADMIN_ROLES}>
      <AppShell>
        <main className="space-y-6" dir="rtl">
          {toast && <ToastBox toast={toast} />}

          <PageHeader
            variant="hero"
            title="ضبط المدرسة والمنصة"
            description="مركز موحد لإدارة بيانات المدرسة، الهوية، العام الدراسي، الفصول، المواد، الصلاحيات، الإشعارات، والاستيراد من Excel."
            badge="إعدادات النظام"
            icon={<Settings size={18} />}
            breadcrumbs={[
              { label: "لوحة التحكم", href: "/dashboard" },
              { label: "الإعدادات" },
            ]}
            meta={[
              { label: "المدرسة", value: settings.school_name || currentSchool?.school_name || "غير محدد" },
              { label: "العام الدراسي", value: settings.academic_year || "غير محدد" },
              { label: "الفصل الدراسي", value: settings.semester || "غير محدد" },
              { label: "نظام الفصول", value: settings.semester_system || "غير محدد" },
            ]}
            stats={[
              { label: "الطلاب", value: stats.students, icon: <Users size={20} />, tone: "blue" },
              { label: "المعلمون", value: stats.teachers, icon: <School size={20} />, tone: "teal" },
              { label: "المستخدمون", value: stats.users, icon: <ShieldCheck size={20} />, tone: "green" },
              { label: "جاهزية النظام", value: `${readinessPercent}%`, icon: <CheckCircle2 size={20} />, tone: readinessPercent >= 80 ? "green" : "gold" },
            ]}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void fetchAll()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <RefreshCcw size={17} />
                  تحديث
                </button>

                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={saving || uploadingLogo}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
                >
                  <Save size={17} />
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </>
            }
          />

          {errorMsg && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
              {errorMsg}
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ExecutiveCard
              title="الطلاب"
              value={stats.students}
              subtitle="إجمالي الطلاب في المدرسة"
              icon={<Users size={22} />}
              tone="blue"
              progress={stats.students > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المعلمون"
              value={stats.teachers}
              subtitle="إجمالي المعلمين"
              icon={<School size={22} />}
              tone="teal"
              progress={stats.teachers > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المستخدمون"
              value={stats.users}
              subtitle="أعضاء المدرسة والصلاحيات"
              icon={<ShieldCheck size={22} />}
              tone="green"
              progress={stats.users > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="المواد"
              value={stats.subjects}
              subtitle="المواد الدراسية المسجلة"
              icon={<BookOpenCheck size={22} />}
              tone="gold"
              progress={stats.subjects > 0 ? 100 : 0}
            />

            <ExecutiveCard
              title="الفصول"
              value={stats.classes}
              subtitle="الفصول والشعب"
              icon={<Building2 size={22} />}
              tone="primary"
              progress={stats.classes > 0 ? 100 : 0}
            />
          </section>

          <SummaryCard
            title="جاهزية النظام"
            description="نسبة اكتمال البيانات والإعدادات الأساسية قبل الإطلاق."
            tone={readinessPercent >= 80 ? "green" : "gold"}
            items={[
              { label: "نسبة الجاهزية", value: `${readinessPercent}%` },
              { label: "الطلاب", value: stats.students },
              { label: "المعلمون", value: stats.teachers },
              { label: "المستخدمون", value: stats.users },
              { label: "المواد", value: stats.subjects },
              { label: "الفصول", value: stats.classes },
            ]}
            footer={
              <div>
                <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                  <span>اكتمال الإعدادات</span>
                  <span>{readinessPercent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0DA9A6]"
                    style={{ width: `${readinessPercent}%` }}
                  />
                </div>
              </div>
            }
          />

          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-10">
            {TABS.map((tab) => (
              <TabCard
                key={tab.id}
                active={activeTab === tab.id}
                title={tab.title}
                icon={tab.icon}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </section>

          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            {activeTab === "school" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<School className="text-[#C1B489]" />}
                  title="بيانات المدرسة"
                  desc="البيانات الرسمية الأساسية للمدرسة."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="اسم المدرسة" value={settings.school_name} onChange={(v) => setSettings({ ...settings, school_name: v })} />
                  <Input label="رمز المدرسة" value={settings.school_code} onChange={(v) => setSettings({ ...settings, school_code: v })} />
                  <Select label="نوع المدرسة" value={settings.school_type} onChange={(v) => setSettings({ ...settings, school_type: v as SchoolType })} options={["boys", "girls", "mixed"]} labels={{ boys: "بنين", girls: "بنات", mixed: "مشترك" }} />
                  <Select label="المرحلة" value={settings.school_stage} onChange={(v) => setSettings({ ...settings, school_stage: v as SchoolStage })} options={["ابتدائي", "متوسط", "ثانوي", "مجمع"]} />
                  <Input label="المدينة" value={settings.city} onChange={(v) => setSettings({ ...settings, city: v })} />
                  <Input label="الإدارة التعليمية" value={settings.education_department} onChange={(v) => setSettings({ ...settings, education_department: v })} />
                  <Input label="اسم المدير" value={settings.principal_name} onChange={(v) => setSettings({ ...settings, principal_name: v })} />
                  <Input label="رقم الجوال" value={settings.phone} onChange={(v) => setSettings({ ...settings, phone: v })} />
                  <Input label="البريد الإلكتروني" value={settings.email} onChange={(v) => setSettings({ ...settings, email: v })} />
                  <Input label="العنوان" value={settings.address} onChange={(v) => setSettings({ ...settings, address: v })} />
                </div>
              </div>
            )}

            {activeTab === "identity" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<Palette className="text-[#C1B489]" />}
                  title="الشعار والهوية"
                  desc="ضبط شعار المدرسة واسم المنصة وألوان الهوية."
                />

                <div className="flex flex-col gap-5 rounded-[28px] bg-slate-50 p-5 md:flex-row md:items-center">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm">
                    {settings.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt="شعار المدرسة"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Image className="text-[#15445A]" size={40} />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-black text-[#15445A]">
                      شعار المدرسة
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      يظهر الشعار في الواجهة والتقارير وبطاقات المدرسة.
                    </p>

                    <label className="mt-4 inline-flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-3 font-bold text-[#15445A] transition hover:border-[#0DA9A6] hover:bg-[#0DA9A6]/10">
                      <UploadCloud size={20} />
                      {uploadingLogo ? "جاري رفع الشعار..." : "رفع الشعار"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingLogo}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadSchoolLogo(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input label="اسم المنصة" value={settings.platform_name} onChange={(v) => setSettings({ ...settings, platform_name: v })} />
                  <ColorInput label="لون الهوية الأساسي" value={settings.primary_color} onChange={(v) => setSettings({ ...settings, primary_color: v })} />
                  <ColorInput label="لون الهوية الثانوي" value={settings.secondary_color} onChange={(v) => setSettings({ ...settings, secondary_color: v })} />
                </div>
              </div>
            )}

            {activeTab === "academic" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<Building2 className="text-[#C1B489]" />}
                  title="العام الدراسي والفصول"
                  desc="ضبط العام الدراسي والفصل الحالي ونظام الفصلين أو الثلاثة فصول."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="العام الدراسي" value={settings.academic_year} onChange={(v) => setSettings({ ...settings, academic_year: v })} placeholder="مثال: 1447" />
                  <Select label="الفصل الدراسي" value={settings.semester} onChange={(v) => setSettings({ ...settings, semester: v as Semester })} options={["الفصل الدراسي الأول", "الفصل الدراسي الثاني", "الفصل الدراسي الثالث"]} />
                  <Select label="نظام الفصول" value={settings.semester_system} onChange={(v) => setSettings({ ...settings, semester_system: v as SemesterSystem })} options={["فصلين", "ثلاثة فصول"]} />
                  <Input label="تاريخ بداية العام" type="date" value={settings.year_start_date} onChange={(v) => setSettings({ ...settings, year_start_date: v })} />
                  <Input label="تاريخ نهاية العام" type="date" value={settings.year_end_date} onChange={(v) => setSettings({ ...settings, year_end_date: v })} />
                </div>
              </div>
            )}

            {activeTab === "classes" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<Building2 className="text-[#C1B489]" />}
                  title="الفصول"
                  desc="إضافة الفصول وربطها بالصف والشعبة."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Input label="اسم الفصل" value={newClass.class_name} onChange={(v) => setNewClass({ ...newClass, class_name: v })} placeholder="مثال: 1 / أ" />
                  <Input label="الصف" value={newClass.grade_level} onChange={(v) => setNewClass({ ...newClass, grade_level: v })} placeholder="مثال: أول ثانوي" />
                  <Input label="الشعبة" value={newClass.section} onChange={(v) => setNewClass({ ...newClass, section: v })} placeholder="مثال: أ" />
                  <button type="button" onClick={() => void addClass()} className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 font-black text-white">
                    <PlusCircle size={18} />
                    إضافة فصل
                  </button>
                </div>

                <SimpleTable
                  headers={["الفصل", "الصف", "الشعبة", ""]}
                  rows={classes.map((item) => [
                    classTitle(item),
                    item.grade_name || item.grade_level || "-",
                    item.section || "-",
                    <button key={item.id} type="button" onClick={() => void deleteClass(item.id)} className="text-red-600">
                      <Trash2 size={18} />
                    </button>,
                  ])}
                />
              </div>
            )}

            {activeTab === "subjects" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<BookOpenCheck className="text-[#C1B489]" />}
                  title="المواد الدراسية"
                  desc="إضافة المواد وربطها بالصفوف."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <Input label="اسم المادة" value={newSubject.subject_name} onChange={(v) => setNewSubject({ ...newSubject, subject_name: v })} placeholder="مثال: الرياضيات" />
                  <Input label="رمز المادة" value={newSubject.subject_code} onChange={(v) => setNewSubject({ ...newSubject, subject_code: v })} placeholder="اختياري" />
                  <Input label="الصف / المرحلة" value={newSubject.grade_level} onChange={(v) => setNewSubject({ ...newSubject, grade_level: v })} placeholder="مثال: أول ثانوي" />
                  <button type="button" onClick={() => void addSubject()} className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 font-black text-white">
                    <PlusCircle size={18} />
                    إضافة مادة
                  </button>
                </div>

                <SimpleTable
                  headers={["المادة", "الرمز", "الصف", ""]}
                  rows={subjects.map((item) => [
                    item.subject_name || "-",
                    item.subject_code || "-",
                    item.grade_level || "-",
                    <button key={item.id} type="button" onClick={() => void deleteSubject(item.id)} className="text-red-600">
                      <Trash2 size={18} />
                    </button>,
                  ])}
                />
              </div>
            )}

            {activeTab === "users" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<Users className="text-[#C1B489]" />}
                  title="المستخدمون والصلاحيات"
                  desc="ملخص المستخدمين داخل المدرسة حسب الدور."
                />

                <InfoPanel
                  title="مستخدمو المدرسة"
                  desc="إدارة المستخدمين التفصيلية تتم من صفحة المستخدمين."
                  rows={[
                    ["إجمالي المستخدمين", String(stats.users)],
                    ["المديرون", String(stats.admins)],
                    ["الوكلاء", String(stats.vicePrincipals)],
                    ["الإداريون", String(stats.administrativeStaff)],
                    ["الموجهون", String(stats.counselors)],
                    ["المعلمون", String(stats.teachers)],
                  ]}
                />

                <Link href="/users" className="inline-flex items-center rounded-2xl bg-[#15445A] px-5 py-3 font-black text-white">
                  إدارة المستخدمين
                </Link>
              </div>
            )}

            {activeTab === "imports" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<FileSpreadsheet className="text-[#C1B489]" />}
                  title="استيراد البيانات"
                  desc="استيراد ملفات Excel أو CSV للطلاب والمعلمين والمواد والفصول والجداول."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Select
                    label="نوع الاستيراد"
                    value={importType}
                    onChange={(v) => {
                      setImportType(v as ImportType);
                      setImportRows([]);
                    }}
                    options={["students", "teachers", "subjects", "classes", "schedule"]}
                    labels={IMPORT_LABELS}
                  />

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-black text-[#15445A]">
                      ملف Excel / CSV
                    </span>
                    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-5 py-3 font-black text-[#15445A] shadow-sm">
                        <UploadCloud size={20} />
                        رفع الملف
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleImportFile(file);
                          }}
                        />
                      </label>
                    </div>
                  </label>
                </div>

                <InfoPanel
                  title="تنسيق الأعمدة المقبول"
                  desc="يمكن استخدام أسماء أعمدة عربية أو إنجليزية، وسيحاول النظام التعرف عليها تلقائيًا."
                  rows={[
                    ["الطلاب", "اسم الطالب، رقم الهوية، رقم الطالب، الصف، الفصل، الجوال، ولي الأمر"],
                    ["المعلمون", "اسم المعلم، المادة، التخصص، الجوال، البريد"],
                    ["المواد", "اسم المادة، رمز المادة، الصف"],
                    ["الفصول", "اسم الفصل، الصف، الشعبة"],
                    ["الجداول", "اليوم، الحصة، الفصل، الشعبة، المادة"],
                  ]}
                />

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-[#15445A]">
                        معاينة البيانات
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        عدد الصفوف المقروءة: {importRows.length}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void executeImport()}
                      disabled={importing || importRows.length === 0}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 font-black text-white disabled:opacity-50"
                    >
                      <Save size={18} />
                      {importing ? "جاري الاستيراد..." : "اعتماد الاستيراد"}
                    </button>
                  </div>

                  {importRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                      لم يتم رفع ملف بعد.
                    </div>
                  ) : (
                    <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full min-w-[900px] text-right text-sm">
                        <thead className="bg-[#15445A] text-white">
                          <tr>
                            {Object.keys(importRows[0] || {}).map((key) => (
                              <th key={key} className="whitespace-nowrap px-4 py-3 font-black">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.slice(0, 20).map((row, index) => (
                            <tr key={index} className="border-b border-slate-100">
                              {Object.keys(importRows[0] || {}).map((key) => (
                                <td key={key} className="whitespace-nowrap px-4 py-3 text-slate-600">
                                  {String(row[key] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <SectionTitle
                  icon={<Bell className="text-[#C1B489]" />}
                  title="الإشعارات"
                  desc="ضبط أنواع التنبيهات التي تظهر داخل النظام."
                />
                <Toggle title="تفعيل الإشعارات" checked={settings.enable_notifications} onChange={(v) => setSettings({ ...settings, enable_notifications: v })} />
                <Toggle title="تنبيه الغياب" checked={settings.notify_absence} onChange={(v) => setSettings({ ...settings, notify_absence: v })} />
                <Toggle title="تنبيه التأخر" checked={settings.notify_late} onChange={(v) => setSettings({ ...settings, notify_late: v })} />
                <Toggle title="تنبيه الدرجات الضعيفة" checked={settings.notify_weak_grades} onChange={(v) => setSettings({ ...settings, notify_weak_grades: v })} />
                <Toggle title="تنبيه حصص الانتظار" checked={settings.notify_waiting_periods} onChange={(v) => setSettings({ ...settings, notify_waiting_periods: v })} />
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="space-y-4">
                <SectionTitle
                  icon={<ShieldCheck className="text-[#C1B489]" />}
                  title="الصلاحيات العامة"
                  desc="إعدادات عامة للتحكم في صلاحيات العمليات داخل المنصة."
                />
                <Toggle title="السماح للمعلم بتعديل الدرجات" checked={settings.allow_teacher_edit_grades} onChange={(v) => setSettings({ ...settings, allow_teacher_edit_grades: v })} />
                <Toggle title="السماح للمعلم بتسجيل الحضور" checked={settings.allow_teacher_attendance} onChange={(v) => setSettings({ ...settings, allow_teacher_attendance: v })} />
                <Toggle title="السماح للوكيل بتعديل السلوك" checked={settings.allow_vice_behavior_edit} onChange={(v) => setSettings({ ...settings, allow_vice_behavior_edit: v })} />
                <Toggle title="السماح للإداري بتعديل بيانات الطلاب" checked={settings.allow_admin_student_edit} onChange={(v) => setSettings({ ...settings, allow_admin_student_edit: v })} />
              </div>
            )}

            {activeTab === "readiness" && (
              <div className="space-y-6">
                <SectionTitle
                  icon={<CheckCircle2 className="text-[#C1B489]" />}
                  title="جاهزية النظام"
                  desc="فحص سريع لاكتمال البيانات الأساسية."
                />

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {readinessItems.map((item) => (
                    <div key={item.title} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                      <span className="font-bold text-[#15445A]">{item.title}</span>
                      {item.done ? (
                        <CheckCircle2 className="text-[#07A869]" />
                      ) : (
                        <XCircle className="text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#07A869]">
                <CheckCircle2 size={18} />
                جميع إعدادات المدرسة والاستيراد تدار من هذه الصفحة.
              </div>

              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving || uploadingLogo}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-6 py-3 font-bold text-white transition hover:bg-[#162b52] disabled:opacity-60"
              >
                <Save size={18} />
                {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </button>
            </div>
          </section>
        </main>
      </AppShell>
    </RoleGuard>
  );
}

function TabCard({
  title,
  icon,
  active,
  onClick,
}: {
  title: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-[#0DA9A6]/30 bg-[#15445A] text-white"
          : "border-slate-100 bg-white text-[#15445A] hover:border-[#0DA9A6]/30"
      }`}
    >
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${
          active ? "bg-[#C1B489] text-[#15445A]" : "bg-[#0DA9A6]/10 text-[#0DA9A6]"
        }`}
      >
        {icon}
      </div>
      <h2 className="text-sm font-black md:text-base">{title}</h2>
    </button>
  );
}

function SectionTitle({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-black text-[#15445A]">{title}</h2>
        <p className="mt-1 text-sm leading-7 text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function Toggle({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:bg-white hover:shadow-sm">
      <span className="font-black text-[#15445A]">{title}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#0DA9A6]"
      />
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#15445A]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0DA9A6] focus:bg-white"
      />
    </label>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#15445A]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="flex-1 bg-transparent outline-none"
        />
      </div>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#15445A]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#0DA9A6] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoPanel({
  title,
  desc,
  rows,
}: {
  title: string;
  desc: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-[28px] bg-slate-50 p-5">
      <div className="mb-4 flex items-center gap-3">
        <CircleAlert className="text-[#C1B489]" size={24} />
        <div>
          <h3 className="text-xl font-black text-[#15445A]">{title}</h3>
          <p className="mt-1 text-sm leading-7 text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-white p-4">
            <span className="text-sm font-bold text-slate-500">{label}</span>
            <span className="font-black text-[#15445A]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-100">
      <table className="w-full text-right text-sm">
        <thead className="bg-[#15445A] text-white">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-black">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="p-6 text-center text-slate-500">
                لا توجد بيانات.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100 last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="rounded-[28px] border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="font-bold">جاري تحميل الإعدادات...</p>
      </div>
    </div>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  const isSuccess = toast.type === "success";

  return (
    <div
      className={`fixed left-5 top-5 z-50 flex max-w-md items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        isSuccess ? "bg-[#07A869]" : "bg-red-600"
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      </span>
      <span>{toast.message}</span>
    </div>
  );
}
