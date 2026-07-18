"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Copy,
  Edit3,
  FileText,
  GraduationCap,
  KeyRound,
  Plus,
  RefreshCcw,
  Save,
  School,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import PageHeader from "@/components/ui/page/PageHeader";
import PageToolbar, { ToolbarSelect } from "@/components/ui/page/PageToolbar";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import SecondaryButton from "@/components/ui/buttons/SecondaryButton";
import ExportButton from "@/components/ui/buttons/ExportButton";
import IconButton from "@/components/ui/buttons/IconButton";
import PageLoader from "@/components/ui/loading/PageLoader";
import SuccessBanner from "@/components/ui/feedback/SuccessBanner";
import ErrorState from "@/components/ui/feedback/ErrorState";
import UiEmptyState from "@/components/ui/empty-state/EmptyState";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/lib/supabase";
import { ExportEngine } from "@/core";
import type { SchoolRole } from "@/lib/permissions";

type SchoolOption = {
  id: string;
  school_name: string;
};

type SchoolMemberSchool = {
  id: string;
  school_name: string | null;
};

type SchoolMemberRow = {
  id: string;
  school_id: string;
  auth_user_id: string;
  role: string;
  is_active: boolean | null;
  schools?: SchoolMemberSchool | SchoolMemberSchool[] | null;
};

type UserView = Record<string, unknown> & {
  id: string;
  school_id: string;
  auth_user_id: string;
  role: SchoolRole;
  role_label: string;
  school_name: string;
  status: "نشط" | "معطل";
  is_active: boolean;
};

type FormState = {
  school_id: string;
  auth_user_id: string;
  role: SchoolRole;
  is_active: boolean;
};

type Message = {
  type: "success" | "error";
  text: string;
};

type RoleOption = {
  value: SchoolRole;
  label: string;
  description: string;
  icon: ElementType;
};

const SCHOOL_ROLES: RoleOption[] = [
  {
    value: "super_admin",
    label: "مدير النظام",
    description: "صلاحية كاملة على جميع المدارس والإعدادات.",
    icon: ShieldCheck,
  },
  {
    value: "school_admin",
    label: "مدير المدرسة",
    description: "إدارة المدرسة والمستخدمين والبيانات الأساسية.",
    icon: School,
  },
  {
    value: "vice_principal",
    label: "وكيل المدرسة",
    description: "الحضور والسلوك والمتابعة التشغيلية.",
    icon: UserCheck,
  },
  {
    value: "administrative_staff",
    label: "إداري",
    description: "خدمات الطلاب والحضور والتقارير.",
    icon: Users,
  },
  {
    value: "student_counselor",
    label: "الموجه الطلابي",
    description: "الحالات والتدخلات والإرشاد الطلابي.",
    icon: GraduationCap,
  },
  {
    value: "health_supervisor",
    label: "الموجه الصحي",
    description: "الصحة المدرسية والزيارات الصحية.",
    icon: UserCheck,
  },
  {
    value: "activity_leader",
    label: "رائد النشاط",
    description: "الأنشطة والفرق والمسابقات.",
    icon: GraduationCap,
  },
  {
    value: "teacher",
    label: "معلم",
    description: "الجداول والحضور والدرجات والتحضير.",
    icon: GraduationCap,
  },
  {
    value: "student",
    label: "طالب",
    description: "بوابة الطالب والدرجات والحضور.",
    icon: Users,
  },
  {
    value: "parent",
    label: "ولي أمر",
    description: "بوابة ولي الأمر ومتابعة الأبناء.",
    icon: Users,
  },
];

const emptyForm: FormState = {
  school_id: "",
  auth_user_id: "",
  role: "teacher",
  is_active: true,
};

function isSchoolRole(value: string): value is SchoolRole {
  return SCHOOL_ROLES.some((role) => role.value === value);
}

function roleLabel(role: SchoolRole) {
  return SCHOOL_ROLES.find((item) => item.value === role)?.label ?? role;
}

function roleDescription(role: SchoolRole) {
  return SCHOOL_ROLES.find((item) => item.value === role)?.description ?? "";
}

function normalizeMember(row: SchoolMemberRow): UserView | null {
  if (!row.id || !row.school_id || !row.auth_user_id) return null;

  const role: SchoolRole = isSchoolRole(row.role) ? row.role : "teacher";
  const school = Array.isArray(row.schools) ? row.schools[0] : row.schools;

  return {
    id: row.id,
    school_id: row.school_id,
    auth_user_id: row.auth_user_id,
    role,
    role_label: roleLabel(role),
    school_name: school?.school_name || "مدرسة غير محددة",
    status: row.is_active === false ? "معطل" : "نشط",
    is_active: row.is_active !== false,
  };
}

async function copyText(value: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export default function UsersPage() {
  const {
    currentSchool,
    currentRole,
    hasPermission,
    loading: schoolLoading,
    refreshSchools,
  } = useSchool();

  const canManage =
    hasPermission("users.manage") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const canView =
    hasPermission("users.view") ||
    currentRole === "super_admin" ||
    currentRole === "school_admin";

  const [members, setMembers] = useState<UserView[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | SchoolRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [schoolFilter, setSchoolFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserView | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const showMessage = useCallback((type: Message["type"], text: string) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage(null);
    }, 3500);
  }, []);

  const handleCopyUserId = useCallback(
    async (value: string) => {
      const copied = await copyText(value);

      showMessage(
        copied ? "success" : "error",
        copied ? "تم نسخ معرّف المستخدم." : "تعذر نسخ معرّف المستخدم.",
      );
    },
    [showMessage],
  );

  const loadSchools = useCallback(async () => {
    const { data, error } = await supabase
      .from("schools")
      .select("id, school_name")
      .order("school_name", { ascending: true });

    if (error) {
      setSchools([]);
      return;
    }

    setSchools(
      (data ?? []).map((school) => ({
        id: school.id,
        school_name: school.school_name || "مدرسة بدون اسم",
      })),
    );
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("school_members")
        .select(
          `
          id,
          school_id,
          auth_user_id,
          role,
          is_active,
          schools (
            id,
            school_name
          )
        `,
        )
        .order("id", { ascending: false });

      if (currentRole !== "super_admin" && currentSchool?.id) {
        query = query.eq("school_id", currentSchool.id);
      }

      const { data, error } = await query;

      if (error) {
        showMessage("error", `تعذر تحميل المستخدمين: ${error.message}`);
        setMembers([]);
        return;
      }

      const normalized = (data ?? [])
        .map((row) => normalizeMember(row as SchoolMemberRow))
        .filter(Boolean) as UserView[];

      setMembers(normalized);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "حدث خطأ غير معروف";
      showMessage("error", `تعذر تحميل المستخدمين: ${messageText}`);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [currentRole, currentSchool?.id, showMessage]);

  useEffect(() => {
    if (!schoolLoading) {
      void loadSchools();
      void loadMembers();
    }
  }, [schoolLoading, loadSchools, loadMembers]);

  const schoolOptions = useMemo(() => {
    if (currentRole === "super_admin") return schools;

    if (currentSchool?.id) {
      return [
        {
          id: currentSchool.id,
          school_name: currentSchool.school_name || "المدرسة الحالية",
        },
      ];
    }

    return [];
  }, [currentRole, currentSchool, schools]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesSearch =
        !query ||
        member.auth_user_id.toLowerCase().includes(query) ||
        member.school_name.toLowerCase().includes(query) ||
        member.role_label.toLowerCase().includes(query) ||
        member.role.toLowerCase().includes(query);

      const matchesRole = roleFilter === "all" || member.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && member.is_active) ||
        (statusFilter === "inactive" && !member.is_active);

      const matchesSchool =
        schoolFilter === "all" || member.school_id === schoolFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesSchool;
    });
  }, [members, search, roleFilter, statusFilter, schoolFilter]);

  const stats = useMemo(() => {
    const active = members.filter((member) => member.is_active).length;
    const inactive = members.filter((member) => !member.is_active).length;
    const admins = members.filter((member) =>
      ["super_admin", "school_admin", "vice_principal", "administrative_staff"].includes(
        member.role,
      ),
    ).length;
    const teachers = members.filter((member) => member.role === "teacher").length;
    const studentsAndParents = members.filter((member) =>
      ["student", "parent"].includes(member.role),
    ).length;

    return {
      total: members.length,
      filtered: filteredMembers.length,
      active,
      inactive,
      admins,
      teachers,
      studentsAndParents,
    };
  }, [members, filteredMembers.length]);

  function openCreateForm() {
    const defaultSchoolId =
      currentRole === "super_admin"
        ? schools[0]?.id || currentSchool?.id || ""
        : currentSchool?.id || "";

    setEditingMember(null);
    setForm({
      ...emptyForm,
      school_id: defaultSchoolId,
    });
    setFormOpen(true);
  }

  function openEditForm(member: UserView) {
    setEditingMember(member);
    setForm({
      school_id: member.school_id,
      auth_user_id: member.auth_user_id,
      role: member.role,
      is_active: member.is_active,
    });
    setFormOpen(true);
  }

  function closeForm() {
    setEditingMember(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function submitForm() {
    if (!canManage) {
      showMessage("error", "لا تملك صلاحية إدارة المستخدمين.");
      return;
    }

    if (!form.school_id) {
      showMessage("error", "اختر المدرسة.");
      return;
    }

    if (!form.auth_user_id.trim()) {
      showMessage("error", "معرّف مستخدم المصادقة مطلوب.");
      return;
    }

    setSaving(true);

    try {
      if (editingMember) {
        const { error } = await supabase
          .from("school_members")
          .update({
            role: form.role,
            is_active: form.is_active,
          })
          .eq("id", editingMember.id);

        if (error) throw error;

        showMessage("success", "تم تحديث صلاحيات المستخدم بنجاح.");
      } else {
        const { error } = await supabase.from("school_members").insert({
          school_id: form.school_id,
          auth_user_id: form.auth_user_id.trim(),
          role: form.role,
          is_active: form.is_active,
        });

        if (error) throw error;

        showMessage("success", "تم ربط المستخدم بالمدرسة بنجاح.");
      }

      closeForm();
      await loadMembers();
      await refreshSchools();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "حدث خطأ غير معروف";
      showMessage("error", `تعذر حفظ المستخدم: ${messageText}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: UserView) {
    if (!canManage) return;

    if (member.role === "super_admin" && member.is_active) {
      showMessage("error", "لا يمكن تعطيل مدير النظام من هذه الصفحة.");
      return;
    }

    const confirmed = window.confirm(
      member.is_active
        ? "هل تريد تعطيل هذا المستخدم؟"
        : "هل تريد تفعيل هذا المستخدم؟",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("school_members")
        .update({ is_active: !member.is_active })
        .eq("id", member.id);

      if (error) throw error;

      showMessage(
        "success",
        member.is_active ? "تم تعطيل المستخدم." : "تم تفعيل المستخدم.",
      );
      await loadMembers();
      await refreshSchools();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "حدث خطأ غير معروف";
      showMessage("error", `تعذر تغيير حالة المستخدم: ${messageText}`);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(member: UserView) {
    if (!canManage) return;

    if (member.role === "super_admin") {
      showMessage("error", "لا يمكن حذف عضوية مدير النظام من هذه الصفحة.");
      return;
    }

    const confirmed = window.confirm(
      "سيتم حذف ربط المستخدم بهذه المدرسة فقط، وليس حذف حساب المصادقة. هل أنت متأكد؟",
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("school_members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      showMessage("success", "تم حذف ربط المستخدم بالمدرسة.");
      await loadMembers();
      await refreshSchools();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "حدث خطأ غير معروف";
      showMessage("error", `تعذر حذف المستخدم: ${messageText}`);
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    ExportEngine.excel("قائمة-المستخدمين", filteredMembers, [
      { header: "معرّف العضوية", key: "id" },
      { header: "معرّف المستخدم", key: "auth_user_id" },
      { header: "المدرسة", key: "school_name" },
      { header: "الدور", key: "role_label" },
      { header: "الحالة", key: "status" },
    ]);
  }

  function exportPDF() {
    ExportEngine.pdf("قائمة المستخدمين", filteredMembers, [
      { header: "معرّف المستخدم", key: "auth_user_id" },
      { header: "المدرسة", key: "school_name" },
      { header: "الدور", key: "role_label" },
      { header: "الحالة", key: "status" },
    ]);
  }

  if (!canView) {
    return (
      <AuthGuard>
        <PageContainer size="wide">
          <ErrorState
            title="لا تملك صلاحية الوصول"
            description="هذه الصفحة مخصصة لمدير النظام ومدير المدرسة."
          />
        </PageContainer>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <PageContainer size="wide" className="space-y-6">
        <Breadcrumb />
        <PageHeader
          variant="hero"
          title="إدارة المستخدمين والصلاحيات"
          description="إدارة عضويات المستخدمين داخل المدارس وتحديد الأدوار وحالة الوصول."
          badge="إدارة الصلاحيات"
          icon={<ShieldCheck size={18} aria-hidden="true" />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "إدارة المستخدمين" },
          ]}
          meta={[
            {
              label: "المدرسة",
              value:
                currentRole === "super_admin"
                  ? "جميع المدارس"
                  : currentSchool?.school_name || "—",
            },
            { label: "إجمالي العضويات", value: stats.total },
            { label: "الحسابات النشطة", value: stats.active },
            { label: "نتائج العرض", value: stats.filtered },
          ]}
          stats={[
            {
              label: "الإدارة",
              value: stats.admins,
              icon: <ShieldCheck size={20} aria-hidden="true" />,
              tone: "primary",
            },
            {
              label: "المعلمون",
              value: stats.teachers,
              icon: <GraduationCap size={20} aria-hidden="true" />,
              tone: "green",
            },
            {
              label: "الطلاب وأولياء الأمور",
              value: stats.studentsAndParents,
              icon: <Users size={20} aria-hidden="true" />,
              tone: "gold",
            },
            {
              label: "الحسابات المعطلة",
              value: stats.inactive,
              icon: <UserX size={20} aria-hidden="true" />,
              tone: stats.inactive > 0 ? "red" : "green",
            },
          ]}
          actions={
            <>
              <SecondaryButton
                icon={<RefreshCcw size={17} aria-hidden="true" />}
                onClick={() => void loadMembers()}
                loading={loading}
              >
                تحديث
              </SecondaryButton>

              <ExportButton
                icon={<FileText size={17} aria-hidden="true" />}
                onClick={exportPDF}
                disabled={!filteredMembers.length}
              >
                PDF
              </ExportButton>

              <ExportButton
                icon={<FileText size={17} aria-hidden="true" />}
                onClick={exportExcel}
                disabled={!filteredMembers.length}
              >
                Excel
              </ExportButton>

              {canManage && (
                <PrimaryButton
                  icon={<Plus size={17} aria-hidden="true" />}
                  onClick={openCreateForm}
                >
                  ربط مستخدم
                </PrimaryButton>
              )}
            </>
          }
        />

        {message && (
          message.type === "success" ? (
            <SuccessBanner description={message.text} />
          ) : (
            <ErrorState description={message.text} />
          )
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveCard
            title="إجمالي العضويات"
            value={stats.total}
            icon={<Users size={22} aria-hidden="true" />}
            tone="primary"
            progress={stats.total > 0 ? 100 : 0}
          />
          <ExecutiveCard
            title="الحسابات النشطة"
            value={stats.active}
            icon={<UserCheck size={22} aria-hidden="true" />}
            tone="green"
            progress={stats.total ? Math.round((stats.active / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="الإدارة"
            value={stats.admins}
            icon={<ShieldCheck size={22} aria-hidden="true" />}
            tone="gold"
            progress={stats.total ? Math.round((stats.admins / stats.total) * 100) : 0}
          />
          <ExecutiveCard
            title="المعلمون والطلاب"
            value={stats.teachers + stats.studentsAndParents}
            icon={<GraduationCap size={22} aria-hidden="true" />}
            tone="primary"
            progress={
              stats.total
                ? Math.round(
                    ((stats.teachers + stats.studentsAndParents) / stats.total) *
                      100,
                  )
                : 0
            }
          />
        </section>

        <SummaryCard
          title="ملخص إدارة المستخدمين"
          description="قراءة تنفيذية لحالة العضويات والأدوار وحسابات الوصول داخل المدارس."
          tone={stats.inactive > 0 ? "gold" : "green"}
          items={[
            { label: "إجمالي العضويات", value: stats.total },
            { label: "النشطة", value: stats.active },
            { label: "المعطلة", value: stats.inactive },
            { label: "الإدارة", value: stats.admins },
            { label: "المعلمون", value: stats.teachers },
            {
              label: "الطلاب وأولياء الأمور",
              value: stats.studentsAndParents,
            },
          ]}
          footer="هذه الصفحة تدير عضويات school_members، ولا تنشئ حسابات المصادقة داخل Supabase."
        />

        <section className="rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-[var(--app-shadow-sm)]">
          <PageToolbar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "ابحث بمعرّف المستخدم أو المدرسة أو الدور...",
            }}
            filters={
              <>
                <ToolbarSelect
                  value={roleFilter}
                  onChange={(value) =>
                    setRoleFilter(value as "all" | SchoolRole)
                  }
                >
                  <option value="all">كل الأدوار</option>
                  {SCHOOL_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </ToolbarSelect>

                <ToolbarSelect
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(
                      value as "all" | "active" | "inactive",
                    )
                  }
                >
                  <option value="all">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                </ToolbarSelect>

                {currentRole === "super_admin" && (
                  <ToolbarSelect
                    value={schoolFilter}
                    onChange={setSchoolFilter}
                  >
                    <option value="all">كل المدارس</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.school_name}
                      </option>
                    ))}
                  </ToolbarSelect>
                )}
              </>
            }
            onRefresh={() => void loadMembers()}
            onExportExcel={exportExcel}
            onExportPDF={exportPDF}
          />
        </section>

        <section className="overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] shadow-[var(--app-shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] p-5">
            <div>
              <h2 className="text-xl font-black text-[var(--app-text)]">
                قائمة المستخدمين
              </h2>
              <p className="mt-1 text-sm font-bold text-[var(--app-text-muted)]">
                عدد النتائج: {filteredMembers.length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right">
              <thead className="bg-[var(--app-card-soft)] text-sm text-[var(--app-text-muted)]">
                <tr>
                  <th className="p-4">المستخدم</th>
                  <th className="p-4">المدرسة</th>
                  <th className="p-4">الدور</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="p-8">
                      <PageLoader text="جاري تحميل المستخدمين..." />
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-[var(--app-border)] transition hover:bg-[var(--app-card-soft)]"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--app-radius-lg)] bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)]">
                            <KeyRound size={20} className="text-[var(--app-text)]" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-[var(--app-text)]">
                              {member.auth_user_id.slice(0, 8)}...
                            </p>

                            <button
                              type="button"
                              onClick={() => void handleCopyUserId(member.auth_user_id)}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--app-text-subtle)] hover:text-[var(--app-text)]"
                            >
                              <Copy size={13} aria-hidden="true" />
                              نسخ معرّف المستخدم
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-[var(--app-text)]">
                          {member.school_name}
                        </div>
                      </td>

                      <td className="p-4">
                        <RoleBadge role={member.role} />
                        <p className="mt-1 text-xs text-[var(--app-text-subtle)]">
                          {roleDescription(member.role)}
                        </p>
                      </td>

                      <td className="p-4">
                        <StatusBadge active={member.is_active} />
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {canManage && (
                            <>
                              <IconButton
                                label="تعديل المستخدم"
                                title="تعديل"
                                onClick={() => openEditForm(member)}
                                icon={<Edit3 size={18} aria-hidden="true" />}
                              />

                              <IconButton
                                label={
                                  member.is_active
                                    ? "تعطيل المستخدم"
                                    : "تفعيل المستخدم"
                                }
                                title={
                                  member.is_active
                                    ? "تعطيل المستخدم"
                                    : "تفعيل المستخدم"
                                }
                                onClick={() => void toggleActive(member)}
                                icon={
                                  member.is_active ? (
                                    <UserX size={18} aria-hidden="true" />
                                  ) : (
                                    <UserCheck size={18} aria-hidden="true" />
                                  )
                                }
                              />

                              <IconButton
                                label="حذف ربط المستخدم"
                                title="حذف الربط"
                                onClick={() => void removeMember(member)}
                                icon={<Trash2 size={18} aria-hidden="true" />}
                              />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8">
                      <UiEmptyState
                        icon={<Users className="h-8 w-8" aria-hidden="true" />}
                        title="لا توجد نتائج"
                        description="لا توجد عضويات مطابقة للبحث أو التصفية الحالية."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {formOpen && (
          <Modal
            title={editingMember ? "تعديل صلاحيات المستخدم" : "ربط مستخدم بمدرسة"}
            onClose={closeForm}
          >
            <div className="mb-5 rounded-[var(--app-radius-lg)] border border-[color-mix(in_srgb,var(--app-primary)_22%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-primary)_8%,transparent)] p-4 text-sm font-bold leading-7 text-[var(--app-text)]">
              هذه الصفحة تدير ربط المستخدمين بالمدارس والصلاحيات. إنشاء حساب
              المصادقة يتم من Supabase أو API مخصص، ثم يربط المعرّف هنا.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-[var(--app-text-muted)]">
                  المدرسة
                </label>
                <select
                  value={form.school_id}
                  disabled={Boolean(editingMember) || currentRole !== "super_admin"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      school_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)] disabled:bg-[var(--app-card-soft)] disabled:text-[var(--app-text-muted)]"
                >
                  <option value="">اختر المدرسة</option>
                  {schoolOptions.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.school_name}
                    </option>
                  ))}
                </select>
              </div>

              <Field
                label="معرّف مستخدم المصادقة"
                value={form.auth_user_id}
                disabled={Boolean(editingMember)}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    auth_user_id: value,
                  }))
                }
                placeholder="auth.users.id"
              />

              <div>
                <label className="mb-2 block text-sm font-black text-[var(--app-text-muted)]">
                  الدور
                </label>
                <select
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      role: event.target.value as SchoolRole,
                    }))
                  }
                  className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)] disabled:bg-[var(--app-card-soft)] disabled:text-[var(--app-text-muted)]"
                >
                  {SCHOOL_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-[var(--app-text-muted)]">
                  حالة الوصول
                </label>
                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      is_active: event.target.value === "active",
                    }))
                  }
                  className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)] disabled:bg-[var(--app-card-soft)] disabled:text-[var(--app-text-muted)]"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <SecondaryButton onClick={closeForm}>
                إلغاء
              </SecondaryButton>

              <PrimaryButton
                icon={<Save size={17} aria-hidden="true" />}
                onClick={() => void submitForm()}
                loading={saving}
              >
                حفظ
              </PrimaryButton>
            </div>
          </Modal>
        )}
      </PageContainer>
    </AuthGuard>
  );
}

function RoleBadge({ role }: { role: SchoolRole }) {
  const style =
    role === "super_admin"
      ? "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]"
      : role === "school_admin"
        ? "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent-foreground)]"
        : role === "teacher"
          ? "bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] text-[var(--app-primary)]"
          : role === "student"
            ? "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]"
            : "bg-[var(--app-card-soft)] text-[var(--app-text)]";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${style}`}>
      {roleLabel(role)}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        active
          ? "bg-[color-mix(in_srgb,var(--app-success)_10%,transparent)] text-[var(--app-success)]"
          : "bg-[color-mix(in_srgb,var(--app-danger)_10%,transparent)] text-[var(--app-danger)]"
      }`}
    >
      {active ? "نشط" : "معطل"}
    </span>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--app-text)_48%,transparent)] p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-[var(--app-shadow-xl)]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[var(--app-text)]">{title}</h2>

          <IconButton
            label="إغلاق"
            title="إغلاق"
            onClick={onClose}
            icon={<X size={20} aria-hidden="true" />}
          />
        </div>

        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-[var(--app-text-muted)]">
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card)] px-4 py-3 text-sm font-bold text-[var(--app-text)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--app-primary)_18%,transparent)] disabled:bg-[var(--app-card-soft)] disabled:text-[var(--app-text-muted)]"
      />
    </div>
  );
}

