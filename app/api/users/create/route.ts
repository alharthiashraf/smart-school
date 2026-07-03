import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SchoolRole =
  | "super_admin"
  | "school_admin"
  | "vice_principal"
  | "administrative_staff"
  | "student_counselor"
  | "health_supervisor"
  | "activity_leader"
  | "teacher"
  | "student"
  | "parent";

type CreateUserBody = {
  full_name?: string;
  email?: string;
  password?: string;
  role?: SchoolRole;
  school_id?: string;
  school_name?: string;
  phone?: string;
};

type ProfilePayload = {
  id: string;
  full_name: string;
  email: string;
  role: SchoolRole;
  school_id: string | null;
  school_name: string | null;
  phone: string | null;
};

const ALLOWED_ROLES: SchoolRole[] = [
  "super_admin",
  "school_admin",
  "vice_principal",
  "administrative_staff",
  "student_counselor",
  "health_supervisor",
  "activity_leader",
  "teacher",
  "student",
  "parent",
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("إعدادات Supabase غير مكتملة في ملف البيئة.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedRole(role: unknown): role is SchoolRole {
  return typeof role === "string" && ALLOWED_ROLES.includes(role as SchoolRole);
}

async function resolveSchoolId(
  supabaseAdmin: SupabaseClient,
  schoolId?: string,
  schoolName?: string,
) {
  const normalizedSchoolId = schoolId?.trim();
  if (normalizedSchoolId) return normalizedSchoolId;

  const normalizedSchoolName = schoolName?.trim();
  if (!normalizedSchoolName) return null;

  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("id")
    .eq("school_name", normalizedSchoolName)
    .maybeSingle();

  if (error) throw error;

  return data?.id ?? null;
}

async function upsertProfile(
  supabaseAdmin: SupabaseClient,
  payload: ProfilePayload,
) {
  const now = new Date().toISOString();

  const userProfilePayload = {
    id: payload.id,
    auth_user_id: payload.id,
    full_name: payload.full_name,
    email: payload.email,
    role: payload.role,
    school_id: payload.school_id,
    school_name: payload.school_name,
    phone: payload.phone,
    is_active: true,
    updated_at: now,
  };

  const userProfilesResult = await supabaseAdmin
    .from("user_profiles")
    .upsert(userProfilePayload, { onConflict: "id" });

  if (!userProfilesResult.error) return;

  const profilesResult = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: payload.id,
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role,
        school_name: payload.school_name,
        phone: payload.phone,
        is_active: true,
        updated_at: now,
      },
      { onConflict: "id" },
    );

  if (profilesResult.error) {
    throw profilesResult.error;
  }
}

async function createRoleRecordIfNeeded(
  supabaseAdmin: SupabaseClient,
  payload: ProfilePayload,
) {
  if (!payload.school_id) return;

  if (payload.role === "teacher") {
    const { error } = await supabaseAdmin
      .from("teachers")
      .upsert(
        {
          school_id: payload.school_id,
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          status: "على رأس العمل",
        },
        { onConflict: "school_id,email" },
      );

    if (error) {
      console.warn("تعذر إنشاء سجل المعلم تلقائيًا:", error.message);
    }
  }
}

async function writeAuditLog(
  supabaseAdmin: SupabaseClient,
  payload: {
    school_id: string | null;
    actor_id: string | null;
    target_id: string;
    role: SchoolRole;
    email: string;
  },
) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    school_id: payload.school_id,
    actor_id: payload.actor_id,
    action: "user.created",
    entity_type: "auth_user",
    entity_id: payload.target_id,
    metadata: {
      email: payload.email,
      role: payload.role,
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("تعذر تسجيل Audit Log:", error.message);
  }
}

async function createWelcomeNotification(
  supabaseAdmin: SupabaseClient,
  payload: {
    school_id: string | null;
    user_id: string;
    full_name: string;
    role: SchoolRole;
  },
) {
  if (!payload.school_id) return;

  const { error } = await supabaseAdmin.from("notifications").insert({
    school_id: payload.school_id,
    user_id: payload.user_id,
    title: "مرحبًا بك في منصة المدرسة الذكية",
    message: `تم إنشاء حسابك بنجاح بدور: ${payload.role}`,
    type: "welcome",
    is_read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.warn("تعذر إنشاء إشعار الترحيب:", error.message);
  }
}

export async function POST(request: Request) {
  let createdUserId: string | null = null;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as CreateUserBody;

    const fullName = body.full_name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const role = body.role;
    const phone = body.phone?.trim() || null;
    const schoolName = body.school_name?.trim() || null;

    if (!fullName || !email || !password || !role) {
      return jsonError("البيانات المطلوبة ناقصة: الاسم، البريد، كلمة المرور، والدور مطلوبة.");
    }

    if (!isValidEmail(email)) {
      return jsonError("صيغة البريد الإلكتروني غير صحيحة.");
    }

    if (password.length < 6) {
      return jsonError("كلمة المرور يجب ألا تقل عن 6 أحرف.");
    }

    if (!isAllowedRole(role)) {
      return jsonError("الدور المحدد غير صحيح.");
    }

    const schoolId = await resolveSchoolId(
      supabaseAdmin,
      body.school_id,
      schoolName || undefined,
    );

    if (!schoolId && role !== "super_admin") {
      return jsonError("يجب تحديد المدرسة أو إرسال اسم مدرسة موجود في النظام.");
    }

    const { data: userList, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (!listError) {
      const exists = userList.users.some(
        (user) => user.email?.toLowerCase() === email,
      );

      if (exists) {
        return jsonError("يوجد مستخدم بنفس البريد الإلكتروني مسبقًا.");
      }
    }

    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
          phone,
          school_id: schoolId,
          school_name: schoolName,
        },
      });

    if (createError || !userData.user) {
      return jsonError(createError?.message || "تعذر إنشاء مستخدم المصادقة.");
    }

    createdUserId = userData.user.id;

    const profilePayload: ProfilePayload = {
      id: createdUserId,
      full_name: fullName,
      email,
      role,
      school_id: schoolId,
      school_name: schoolName,
      phone,
    };

    await upsertProfile(supabaseAdmin, profilePayload);

    if (schoolId) {
      const { error: memberError } = await supabaseAdmin
        .from("school_members")
        .upsert(
          {
            school_id: schoolId,
            auth_user_id: createdUserId,
            role,
            is_active: true,
          },
          { onConflict: "school_id,auth_user_id" },
        );

      if (memberError) throw memberError;
    }

    await createRoleRecordIfNeeded(supabaseAdmin, profilePayload);
    await createWelcomeNotification(supabaseAdmin, {
      school_id: schoolId,
      user_id: createdUserId,
      full_name: fullName,
      role,
    });
    await writeAuditLog(supabaseAdmin, {
      school_id: schoolId,
      actor_id: null,
      target_id: createdUserId,
      role,
      email,
    });

    return NextResponse.json({
      success: true,
      message: "تم إنشاء المستخدم وربطه بالمدرسة بنجاح.",
      user: {
        id: createdUserId,
        email,
        full_name: fullName,
        role,
        school_id: schoolId,
      },
    });
  } catch (error) {
    if (createdUserId) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      } catch {
        // لا نمنع إرجاع الخطأ الأصلي إذا فشل التراجع.
      }
    }

    const message =
      error instanceof Error ? error.message : "حدث خطأ غير متوقع.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
