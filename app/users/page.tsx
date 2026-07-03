"use client";

import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Copy,
  Download,
  Edit3,
  FileText,
  Filter,
  GraduationCap,
  KeyRound,
  Plus,
  RefreshCcw,
  Save,
  School,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
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

function copyText(value: string) {
  if (typeof navigator === "undefined") return;
  void navigator.clipboard.writeText(value);
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
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-amber-700" />
          <h1 className="text-xl font-black text-amber-800">
            لا تملك صلاحية الوصول إلى إدارة المستخدمين
          </h1>
          <p className="mt-2 text-sm font-bold text-amber-700">
            هذه الصفحة مخصصة لمدير النظام ومدير المدرسة.
          </p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="space-y-6" dir="rtl">
        <section className="rounded-[32px] bg-gradient-to-l from-[#0f1f3d] via-[#18315f] to-[#24477f] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-[#d4af37]">
                <ShieldCheck size={17} />
                إدارة الصلاحيات
              </div>

              <h1 className="text-4xl font-black">
                إدارة المستخدمين والصلاحيات
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                إدارة عضويات المستخدمين داخل المدارس، وتحديد الأدوار، وتفعيل أو
                تعطيل الوصول حسب صلاحيات المدرسة الحالية.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadMembers()}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCcw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
                تحديث
              </button>

              <button
                type="button"
                onClick={exportPDF}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <Download size={17} />
                PDF
              </button>

              <button
                type="button"
                onClick={exportExcel}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                <FileText size={17} />
                Excel
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d4af37] px-5 py-3 text-sm font-black text-[#0f1f3d] transition hover:bg-[#e5c756]"
                >
                  <Plus size={17} />
                  ربط مستخدم
                </button>
              )}
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-2xl border p-4 text-sm font-bold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="إجمالي العضويات"
            value={stats.total}
            icon={<Users size={24} />}
            color="blue"
          />
          <StatCard
            title="الحسابات النشطة"
            value={stats.active}
            icon={<UserCheck size={24} />}
            color="green"
          />
          <StatCard
            title="الإدارة"
            value={stats.admins}
            icon={<ShieldCheck size={24} />}
            color="amber"
          />
          <StatCard
            title="المعلمون والطلاب"
            value={stats.teachers + stats.studentsAndParents}
            icon={<GraduationCap size={24} />}
            color="violet"
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-[#0f1f3d]">
            <Filter size={20} />
            <h2 className="text-xl font-black">البحث والتصفية</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 lg:col-span-2">
              <Search size={18} className="text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث بمعرّف المستخدم أو المدرسة أو الدور..."
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as "all" | SchoolRole)
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
            >
              <option value="all">كل الأدوار</option>
              {SCHOOL_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive")
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">معطل</option>
            </select>

            {currentRole === "super_admin" && (
              <select
                value={schoolFilter}
                onChange={(event) => setSchoolFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37] lg:col-span-2"
              >
                <option value="all">كل المدارس</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.school_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-xl font-black text-[#0f1f3d]">
                قائمة المستخدمين
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                عدد النتائج: {filteredMembers.length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-right">
              <thead className="bg-slate-50 text-sm text-slate-500">
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
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      جاري تحميل المستخدمين...
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-t border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f1f3d]/10">
                            <KeyRound size={20} className="text-[#0f1f3d]" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-[#0f1f3d]">
                              {member.auth_user_id.slice(0, 8)}...
                            </p>

                            <button
                              type="button"
                              onClick={() => copyText(member.auth_user_id)}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-[#0f1f3d]"
                            >
                              <Copy size={13} />
                              نسخ معرّف المستخدم
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-700">
                          {member.school_name}
                        </div>
                      </td>

                      <td className="p-4">
                        <RoleBadge role={member.role} />
                        <p className="mt-1 text-xs text-slate-400">
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
                              <button
                                type="button"
                                onClick={() => openEditForm(member)}
                                className="rounded-xl bg-blue-50 p-2 text-blue-700 transition hover:bg-blue-100"
                                title="تعديل"
                              >
                                <Edit3 size={18} />
                              </button>

                              <button
                                type="button"
                                onClick={() => void toggleActive(member)}
                                className={`rounded-xl p-2 transition ${
                                  member.is_active
                                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                                title={
                                  member.is_active
                                    ? "تعطيل المستخدم"
                                    : "تفعيل المستخدم"
                                }
                              >
                                {member.is_active ? (
                                  <UserX size={18} />
                                ) : (
                                  <UserCheck size={18} />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => void removeMember(member)}
                                className="rounded-xl bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100"
                                title="حذف الربط"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      لا توجد نتائج مطابقة.
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
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-7 text-blue-800">
              هذه الصفحة تدير ربط المستخدمين بالمدارس والصلاحيات. إنشاء حساب
              المصادقة نفسه يتم من لوحة Supabase أو من API مخصص، ثم يتم ربط
              معرّف المستخدم هنا.
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-black text-slate-600">
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37] disabled:bg-slate-100"
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
                <label className="mb-2 block text-sm font-black text-slate-600">
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
                >
                  {SCHOOL_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-600">
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
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37]"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={() => void submitForm()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0f1f3d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#162b52] disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </Modal>
        )}
      </main>
    </AuthGuard>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: "blue" | "green" | "amber" | "violet";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <div className={colors[color]}>{icon}</div>
      </div>

      <h2 className="mt-4 text-3xl font-black text-[#0f1f3d]">{value}</h2>
    </div>
  );
}

function RoleBadge({ role }: { role: SchoolRole }) {
  const style =
    role === "super_admin"
      ? "bg-red-50 text-red-700"
      : role === "school_admin"
        ? "bg-orange-50 text-orange-700"
        : role === "teacher"
          ? "bg-blue-50 text-blue-700"
          : role === "student"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-700";

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
        active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#0f1f3d]">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
          >
            <X size={20} />
          </button>
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
      <label className="mb-2 block text-sm font-black text-slate-600">
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#d4af37] disabled:bg-slate-100"
      />
    </div>
  );
}
