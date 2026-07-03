import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "./roles";
import { isSchoolRole } from "./roles";

export type SchoolMember = {
  id: string;
  school_id: string;
  auth_user_id: string;
  role: SchoolRole;
  is_active: boolean;
};

export type UserSchool = {
  id: string;
  school_name: string;
  logo_url: string | null;
  city?: string | null;
  semester_system?: string | null;
  member_id: string;
  role: SchoolRole;
};

type SchoolRelation = {
  id: string;
  school_name: string | null;
  logo_url: string | null;
  city: string | null;
  semester_system: string | null;
};

type SchoolMemberQueryRow = {
  id: string;
  school_id: string;
  auth_user_id: string;
  role: string;
  is_active: boolean;
  schools: SchoolRelation | SchoolRelation[] | null;
};

function firstSchool(
  schools: SchoolRelation | SchoolRelation[] | null,
): SchoolRelation | null {
  if (Array.isArray(schools)) {
    return schools[0] ?? null;
  }

  return schools;
}

export async function getUserSchoolMemberships(): Promise<UserSchool[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUserId = sessionData.session?.user?.id;

  if (!authUserId) return [];

  const { data, error } = await supabase
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
        school_name,
        logo_url,
        city,
        semester_system
      )
    `,
    )
    .eq("auth_user_id", authUserId)
    .eq("is_active", true);

  if (error) {
    console.error("getUserSchoolMemberships error:", error);
    return [];
  }

  return ((data ?? []) as SchoolMemberQueryRow[])
    .map((row): UserSchool | null => {
      const school = firstSchool(row.schools);

      if (!school || !isSchoolRole(row.role)) return null;

      return {
        id: school.id,
        school_name: school.school_name ?? "مدرسة بدون اسم",
        logo_url: school.logo_url ?? null,
        city: school.city ?? null,
        semester_system: school.semester_system ?? null,
        member_id: row.id,
        role: row.role,
      };
    })
    .filter((school): school is UserSchool => school !== null);
}

export function resolveCurrentSchool(
  schools: UserSchool[],
  storedSchoolId?: string | null,
): UserSchool | null {
  if (schools.length === 0) return null;

  if (storedSchoolId) {
    const stored = schools.find((school) => school.id === storedSchoolId);
    if (stored) return stored;
  }

  const superAdminSchool = schools.find(
    (school) => school.role === "super_admin",
  );

  return superAdminSchool ?? schools[0];
}