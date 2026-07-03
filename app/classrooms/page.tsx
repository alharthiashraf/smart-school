"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileText,
  Plus,
  Power,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { ExportEngine } from "@/core";

type StageRow = {
  id: string;
  school_id: string;
  stage_name: string | null;
  stage_key?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

type ClassroomRow = {
  id: string;
  school_id: string;
  stage_id?: string | null;
  classroom_name: string | null;
  grade_name?: string | null;
  track_name?: string | null;
  section?: string | null;
  capacity?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  stages?: StageRow | StageRow[] | null;
};

type ClassroomView = ClassroomRow & {
  displayName: string;
  displayGrade: string;
  displayTrack: string;
  displaySection: string;
  displayStage: string;
  displayCapacity: number;
  statusLabel: "نشط" | "غير نشط";
};

type ClassroomForm = {
  stage_id: string;
  classroom_name: string;
  grade_name: string;
  track_name: string;
  section: string;
  capacity: string;
  is_active: boolean;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

const PAGE_SIZE = 10;

const emptyForm: ClassroomForm = {
  stage_id: "",
  classroom_name: "",
  grade_name: "",
  track_name: "",
  section: "",
  capacity: "30",
  is_active: true,
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function getStageName(classroom: ClassroomRow) {
  const stage = Array.isArray(classroom.stages)
    ? classroom.stages[0]
    : classroom.stages;

  return stage?.stage_name || "غير محدد";
}

function normalizeClassroom(classroom: ClassroomRow): ClassroomView {
  return {
    ...classroom,
    displayName: classroom.classroom_name || "فصل بدون اسم",
    displayGrade: classroom.grade_name || "غير محدد",
    displayTrack: classroom.track_name || "عام",
    displaySection: classroom.section || "-",
    displayStage: getStageName(classroom),
    displayCapacity: Number(classroom.capacity || 0),
    statusLabel: classroom.is_active === false ? "غير نشط" : "نشط",
  };
}

function toPayload(schoolId: string, form: ClassroomForm) {
  return {
    school_id: schoolId,
    stage_id: form.stage_id || null,
    classroom_name: form.classroom_name.trim(),
    grade_name: form.grade_name.trim() || null,
    track_name: form.track_name.trim() || null,
    section: form.section.trim() || null,
    capacity: Number(form.capacity) || null,
    is_active: form.is_active,
  };
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ar"));
}

export default function ClassroomsPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    loading: schoolLoading,
  } = useSchool();

  const canManage =
    hasPermission("classrooms.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const canView =
    hasPermission("classrooms.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin" ||
    currentRole === "vice_principal" ||
    currentRole === "administrative_staff" ||
    currentRole === "teacher";

  const [classrooms, setClassrooms] = useState<ClassroomRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] =
    useState<ClassroomView | null>(null);
  const [selectedClassroom, setSelectedClassroom] =
    useState<ClassroomView | null>(null);
  const [form, setForm] = useState<ClassroomForm>(emptyForm);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    if (!currentSchool?.id) {
      setClassrooms([]);
      setStages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const schoolId = currentSchool.id;

      const [classroomsResult, stagesResult] = await Promise.allSettled([
        supabase
          .from("classrooms")
          .select(
            `
            id,
            school_id,
            stage_id,
            classroom_name,
            grade_name,
            track_name,
            section,
            capacity,
            is_active,
            created_at,
            stages (
              id,
              school_id,
              stage_name,
              stage_key,
              sort_order,
              is_active
            )
          `,
          )
          .eq("school_id", schoolId)
          .order("grade_name", { ascending: true })
          .order("classroom_name", { ascending: true }),

        supabase
          .from("stages")
          .select("id, school_id, stage_name, stage_key, sort_order, is_active")
          .eq("school_id", schoolId)
          .order("sort_order", { ascending: true }),
      ]);

      if (classroomsResult.status === "fulfilled") {
        if (classroomsResult.value.error) throw classroomsResult.value.error;
        setClassrooms((classroomsResult.value.data as ClassroomRow[]) || []);
      }

      if (stagesResult.status === "fulfilled") {
        if (stagesResult.value.error) {
          setStages([]);
        } else {
          setStages((stagesResult.value.data as StageRow[]) || []);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل الفصول الدراسية.";
      showToast("error", message);
      setClassrooms([]);
    } finally {
      setLoading(false);
    }
  }, [currentSchool?.id, showToast]);

  useEffect(() => {
    if (!schoolLoading) {
      void loadData();
    }
  }, [schoolLoading, loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, stageFilter, gradeFilter, trackFilter, statusFilter]);

  const activeStages = useMemo(
    () => stages.filter((stage) => stage.is_active !== false),
    [stages],
  );

  const rows = useMemo(() => classrooms.map(normalizeClassroom), [classrooms]);

  const grades = useMemo(
    () => uniqueValues(rows.map((row) => row.grade_name)),
    [rows],
  );

  const tracks = useMemo(
    () => uniqueValues(rows.map((row) => row.track_name)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((classroom) => {
      const text = [
        classroom.displayName,
        classroom.displayGrade,
        classroom.displayTrack,
        classroom.displaySection,
        classroom.displayStage,
        classroom.statusLabel,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || text.includes(keyword);

      const matchesStage =
        stageFilter === "all" || classroom.stage_id === stageFilter;

      const matchesGrade =
        gradeFilter === "all" || classroom.grade_name === gradeFilter;

      const matchesTrack =
        trackFilter === "all" || classroom.track_name === trackFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && classroom.is_active !== false) ||
        (statusFilter === "inactive" && classroom.is_active === false);

      return (
        matchesSearch &&
        matchesStage &&
        matchesGrade &&
        matchesTrack &&
        matchesStatus
      );
    });
  }, [rows, search, stageFilter, gradeFilter, trackFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.is_active !== false).length;
    const inactive = rows.filter((row) => row.is_active === false).length;
    const totalCapacity = rows.reduce(
      (sum, row) => sum + Number(row.capacity || 0),
      0,
    );

    return {
      total: rows.length,
      filtered: filteredRows.length,
      active,
      inactive,
      totalCapacity,
      stages: new Set(rows.map((row) => row.stage_id).filter(Boolean)).size,
    };
  }, [rows, filteredRows.length]);

  function openCreateForm() {
    setEditingClassroom(null);
    setForm({
      ...emptyForm,
      stage_id: activeStages[0]?.id || "",
    });
    setFormOpen(true);
  }

  function openEditForm(classroom: ClassroomView) {
    setEditingClassroom(classroom);
    setForm({
      stage_id: classroom.stage_id || "",
      classroom_name: classroom.classroom_name || "",
      grade_name: classroom.grade_name || "",
      track_name: classroom.track_name || "",
      section: classroom.section || "",
      capacity: String(classroom.capacity || 30),
      is_active: classroom.is_active !== false,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setEditingClassroom(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function submitForm() {
    if (!canManage) {
      showToast("error", "لا تملك صلاحية إدارة الفصول.");
      return;
    }

    if (!currentSchool?.id) {
      showToast("error", "لا توجد مدرسة مرتبطة بالمستخدم الحالي.");
      return;
    }

    if (!form.classroom_name.trim()) {
      showToast("error", "اسم الفصل مطلوب.");
      return;
    }

    setSaving(true);

    try {
      const payload = toPayload(currentSchool.id, form);

      const { error } = editingClassroom
        ? await supabase
            .from("classrooms")
            .update(payload)
            .eq("id", editingClassroom.id)
            .eq("school_id", currentSchool.id)
        : await supabase.from("classrooms").insert(payload);

      if (error) throw error;

      showToast(
        "success",
        editingClassroom ? "تم تحديث الفصل بنجاح." : "تم إنشاء الفصل بنجاح.",
      );

      closeForm();
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حفظ الفصل.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(classroom: ClassroomView) {
    if (!canManage || !currentSchool?.id) return;

    const nextStatus = classroom.is_active === false;
    const confirmed = window.confirm(
      nextStatus ? "هل تريد تفعيل هذا الفصل؟" : "هل تريد تعطيل هذا الفصل؟",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("classrooms")
        .update({ is_active: nextStatus })
        .eq("id", classroom.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      showToast(
        "success",
        nextStatus ? "تم تفعيل الفصل." : "تم تعطيل الفصل.",
      );

      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تغيير حالة الفصل.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function removeClassroom(classroom: ClassroomView) {
    if (!canManage || !currentSchool?.id) return;

    const confirmed = window.confirm(
      `سيتم حذف الفصل "${classroom.displayName}" نهائيًا. هل أنت متأكد؟`,
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("classrooms")
        .delete()
        .eq("id", classroom.id)
        .eq("school_id", currentSchool.id);

      if (error) throw error;

      if (selectedClassroom?.id === classroom.id) {
        setSelectedClassroom(null);
      }

      showToast("success", "تم حذف الفصل بنجاح.");
      await loadData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر حذف الفصل.";
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("قائمة-الفصول", filteredRows, [
      { header: "اسم الفصل", key: "displayName" },
      { header: "الصف", key: "displayGrade" },
      { header: "المسار", key: "displayTrack" },
      { header: "الشعبة", key: "displaySection" },
      { header: "المرحلة", key: "displayStage" },
      { header: "السعة", key: "displayCapacity" },
      { header: "الحالة", key: "statusLabel" },
      { header: "تاريخ الإضافة", key: "created_at" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("الفصول الدراسية", filteredRows, [
      { header: "اسم الفصل", key: "displayName" },
      { header: "الصف", key: "displayGrade" },
      { header: "المسار", key: "displayTrack" },
      { header: "الشعبة", key: "displaySection" },
      { header: "المرحلة", key: "displayStage" },
      { header: "السعة", key: "displayCapacity" },
      { header: "الحالة", key: "statusLabel" },
    ]);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا تملك صلاحية الوصول إلى الفصول الدراسية"
          description="هذه الصفحة مخصصة للإدارة المدرسية حسب الصلاحيات."
          tone="gold"
          icon={<Building2 size={22} />}
        />
      </AuthGuard>
    );
  }

  if (schoolLoading) {
    return (
      <AuthGuard>
        <LoadingBox text="جاري تحميل بيانات المدرسة..." />
      </AuthGuard>
    );
  }

  if (!currentSchool) {
    return (
      <AuthGuard>
        <SummaryCard
          title="لا توجد مدرسة مرتبطة"
          description="لا توجد مدرسة مرتبطة بالمستخدم الحالي."
          tone="red"
          icon={<Building2 size={22} />}
        />
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-5" dir="rtl">
        {toast && <ToastBox toast={toast} />}
        <PageHeader
          variant="hero"
          title="الفصول الدراسية"
          description={`${currentSchool.school_name} — إدارة الفصول وربطها بالمراحل والصفوف والمسارات، لتكون قاعدة للجداول والحضور والدرجات.`}
          badge="الإدارة الأكاديمية"
          icon={<Building2 size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الفصول الدراسية" },
          ]}
          meta={[
            { label: "المدرسة", value: currentSchool.school_name },
            { label: "الفصول الظاهرة", value: filteredRows.length },
            { label: "المراحل المرتبطة", value: stats.stages },
            { label: "إجمالي السعة", value: stats.totalCapacity },
          ]}
          stats={[
            { label: "إجمالي الفصول", value: stats.total, icon: <Building2 size={20} />, tone: "blue" },
            { label: "فصول نشطة", value: stats.active, icon: <CheckCircle2 size={20} />, tone: "green" },
            { label: "غير نشطة", value: stats.inactive, icon: <XCircle size={20} />, tone: stats.inactive > 0 ? "red" : "green" },
            { label: "إجمالي السعة", value: stats.totalCapacity, icon: <UsersRound size={20} />, tone: "gold" },
          ]}
          actions={
            <>
              {canManage && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <Plus size={17} />
                  إضافة فصل
                </button>
              )}

              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-[#15445A] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Download size={17} />
                Excel
              </button>

              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0DA9A6] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Printer size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={() => void loadData()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
              >
                <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
                تحديث
              </button>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <ExecutiveCard
            title="إجمالي الفصول"
            value={stats.total}
            subtitle="كل الفصول المسجلة"
            icon={<Building2 size={22} />}
            tone="blue"
            progress={stats.total > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="نتائج البحث"
            value={stats.filtered}
            subtitle={`من ${stats.total} فصل`}
            icon={<FileText size={22} />}
            tone="primary"
            progress={stats.total ? Math.round((stats.filtered / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="فصول نشطة"
            value={stats.active}
            subtitle="جاهزة للجداول والحضور"
            icon={<CheckCircle2 size={22} />}
            tone="green"
            progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="فصول غير نشطة"
            value={stats.inactive}
            subtitle={stats.inactive > 0 ? "تحتاج مراجعة" : "لا توجد فصول معطلة"}
            icon={<XCircle size={22} />}
            tone={stats.inactive > 0 ? "red" : "green"}
            progress={stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="إجمالي السعة"
            value={stats.totalCapacity}
            subtitle={`${stats.stages} مراحل مرتبطة`}
            icon={<UsersRound size={22} />}
            tone="gold"
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للفصول"
          description="قراءة سريعة لحالة الفصول الدراسية وربطها بالمراحل والصفوف والمسارات والسعة التشغيلية."
          tone={stats.inactive > 0 ? "gold" : "green"}
          items={[
            { label: "إجمالي الفصول", value: stats.total },
            { label: "الفصول النشطة", value: stats.active },
            { label: "غير النشطة", value: stats.inactive },
            { label: "نتائج البحث", value: stats.filtered },
            { label: "المراحل المرتبطة", value: stats.stages },
            { label: "إجمالي السعة", value: stats.totalCapacity },
          ]}
          footer="تستخدم الفصول في توزيع الطلاب والجداول والحضور والدرجات؛ لذلك يفضل ضبط المرحلة والصف والشعبة قبل اعتمادها."
        />

        {formOpen && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {editingClassroom ? (
                  <Edit3 className="text-[#C1B489]" />
                ) : (
                  <Plus className="text-[#C1B489]" />
                )}

                <h2 className="text-xl font-black text-[#15445A]">
                  {editingClassroom ? "تعديل فصل" : "إضافة فصل"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold"
              >
                إغلاق
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={form.stage_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stage_id: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
              >
                <option value="">بدون مرحلة</option>
                {activeStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.stage_name || "مرحلة بدون اسم"}
                  </option>
                ))}
              </select>

              <Input
                placeholder="اسم الفصل"
                value={form.classroom_name}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    classroom_name: value,
                  }))
                }
              />

              <Input
                placeholder="الصف"
                value={form.grade_name}
                onChange={(value) =>
                  setForm((current) => ({ ...current, grade_name: value }))
                }
              />

              <Input
                placeholder="المسار"
                value={form.track_name}
                onChange={(value) =>
                  setForm((current) => ({ ...current, track_name: value }))
                }
              />

              <Input
                placeholder="الشعبة"
                value={form.section}
                onChange={(value) =>
                  setForm((current) => ({ ...current, section: value }))
                }
              />

              <Input
                placeholder="السعة"
                type="number"
                value={form.capacity}
                onChange={(value) =>
                  setForm((current) => ({ ...current, capacity: value }))
                }
              />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
                الفصل نشط
              </label>
            </div>

            <button
              type="button"
              onClick={() => void submitForm()}
              disabled={saving}
              className="mt-5 flex items-center gap-2 rounded-2xl bg-[#15445A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-col gap-4 print:hidden">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-[#15445A]">
                    قائمة الفصول
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    عرض {pagedRows.length} من {filteredRows.length} فصل
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-3 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث باسم الفصل أو الصف أو المرحلة..."
                    className="w-full rounded-2xl border border-slate-200 py-3 pl-4 pr-10 outline-none focus:border-[#0DA9A6]"
                  />
                </div>

                <select
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل المراحل</option>
                  {activeStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.stage_name || "مرحلة بدون اسم"}
                    </option>
                  ))}
                </select>

                <select
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل الصفوف</option>
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "all" | "active" | "inactive",
                    )
                  }
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6]"
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>

                {tracks.length > 0 && (
                  <select
                    value={trackFilter}
                    onChange={(event) => setTrackFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0DA9A6] lg:col-span-2"
                  >
                    <option value="all">كل المسارات</option>
                    {tracks.map((track) => (
                      <option key={track} value={track}>
                        {track}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-right text-sm text-slate-500">
                    <th className="rounded-r-2xl px-4 py-3">الفصل</th>
                    <th className="px-4 py-3">المرحلة</th>
                    <th className="px-4 py-3">الصف</th>
                    <th className="px-4 py-3">المسار</th>
                    <th className="px-4 py-3">الشعبة</th>
                    <th className="px-4 py-3">السعة</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="rounded-l-2xl px-4 py-3 print:hidden">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {!loading &&
                    pagedRows.map((classroom) => (
                      <tr
                        key={classroom.id}
                        className="border-b border-slate-50 text-sm transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-black text-[#15445A]">
                            {classroom.displayName}
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-400">
                            رقم السجل: {classroom.id.slice(0, 8)}
                          </div>
                        </td>

                        <td className="px-4 py-3">{classroom.displayStage}</td>
                        <td className="px-4 py-3">{classroom.displayGrade}</td>
                        <td className="px-4 py-3">{classroom.displayTrack}</td>
                        <td className="px-4 py-3">{classroom.displaySection}</td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                            {classroom.displayCapacity}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <ClassroomStatusBadge
                            active={classroom.is_active !== false}
                          />
                        </td>

                        <td className="px-4 py-3 print:hidden">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedClassroom(classroom)}
                              className="rounded-xl bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                              title="عرض مختصر"
                            >
                              <Eye size={16} />
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditForm(classroom)}
                                  className="rounded-xl bg-[#3D7EB9]/10 p-2 text-[#3D7EB9] hover:bg-[#3D7EB9]/20"
                                  title="تعديل"
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void toggleActive(classroom)}
                                  className="rounded-xl bg-[#C1B489]/20 p-2 text-[#15445A] hover:bg-[#C1B489]/30"
                                  title={
                                    classroom.is_active === false
                                      ? "تفعيل"
                                      : "تعطيل"
                                  }
                                >
                                  <Power size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void removeClassroom(classroom)}
                                  className="rounded-xl bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {loading && (
                <div className="py-10 text-center text-slate-500">
                  جاري تحميل الفصول الدراسية...
                </div>
              )}

              {!loading && filteredRows.length === 0 && (
                <div className="py-10 text-center text-slate-500">
                  لا توجد فصول مطابقة للبحث
                </div>
              )}
            </div>

            {!loading && filteredRows.length > 0 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  عرض {pagedRows.length} من {filteredRows.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page === 1}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronRight size={18} />
                  </button>

                  <span className="text-sm font-bold text-slate-700">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={page === totalPages}
                    className="rounded-xl border p-2 disabled:opacity-40"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <ClassroomSideCard
            selectedClassroom={selectedClassroom}
            setSelectedClassroom={setSelectedClassroom}
          />
        </section>
      </div>
    </AuthGuard>
  );
}

function ToastBox({ toast }: { toast: Toast }) {
  return (
    <div
      className={`fixed left-5 top-5 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-xl print:hidden ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <span>{toast.message}</span>
    </div>
  );
}

function Input({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#0DA9A6]"
    />
  );
}

function ClassroomStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-[#07A869]/10 text-[#07A869]" : "bg-red-50 text-red-700"
      }`}
    >
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

function ClassroomSideCard({
  selectedClassroom,
  setSelectedClassroom,
}: {
  selectedClassroom: ClassroomView | null;
  setSelectedClassroom: (classroom: ClassroomView | null) => void;
}) {
  if (!selectedClassroom) {
    return (
      <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="flex min-h-[350px] items-center justify-center rounded-3xl bg-slate-50 text-center">
          <div>
            <Building2 size={42} className="mx-auto text-[#C1B489]" />
            <h3 className="mt-4 text-xl font-black text-[#15445A]">
              اختر فصلًا
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              اضغط على أيقونة العين لعرض تفاصيل الفصل
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#15445A]">
          تفاصيل الفصل
        </h2>

        <button
          type="button"
          onClick={() => setSelectedClassroom(null)}
          className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      <div className="rounded-[28px] bg-[#15445A] p-5 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C1B489] text-[#15445A]">
            <Building2 size={28} />
          </div>

          <div>
            <h3 className="text-2xl font-black text-[#C1B489]">
              {selectedClassroom.displayName}
            </h3>

            <p className="text-sm text-slate-300">
              {selectedClassroom.displayGrade} — {selectedClassroom.displaySection}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoMini title="المرحلة" value={selectedClassroom.displayStage} />
          <InfoMini title="الصف" value={selectedClassroom.displayGrade} />
          <InfoMini title="المسار" value={selectedClassroom.displayTrack} />
          <InfoMini title="الشعبة" value={selectedClassroom.displaySection} />
          <InfoMini
            title="السعة"
            value={String(selectedClassroom.displayCapacity)}
          />
          <InfoMini title="الحالة" value={selectedClassroom.statusLabel} />
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-500">ملاحظة تشغيلية</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          هذا الفصل يستخدم في توزيع الطلاب، الجداول، الحضور، الدرجات، وإسناد
          المعلمين. تأكد من صحة المرحلة والصف والشعبة قبل بناء الجداول.
        </p>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black text-slate-400">تاريخ الإضافة</p>
        <p className="mt-2 font-black text-[#15445A]">
          {formatDate(selectedClassroom.created_at)}
        </p>
      </div>
    </div>
  );
}

function InfoMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs text-slate-300">{title}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
    </div>
  );
}

function LoadingBox({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-slate-100 bg-white p-6 text-center text-slate-500 shadow-sm">
      <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#15445A]" />
      {text}
    </div>
  );
}
