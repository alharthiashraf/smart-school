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

type SchoolRow = {
  id: string;
  school_name: string | null;
  logo_url: string | null;
  city: string | null;
  semester_system: string | null;
};

type SchoolMemberRow = {
  id: string;
  school_id: string;
  auth_user_id: string;
  role: string;
  is_active: boolean;
};

export async function getUserSchoolMemberships(): Promise<UserSchool[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return [];
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("school_members")
    .select("id, school_id, auth_user_id, role, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true);

  if (membershipsError) {
    console.error("getUserSchoolMemberships memberships error:", membershipsError);
    return [];
  }

  const validMemberships = ((memberships ?? []) as SchoolMemberRow[]).filter(
    (membership) => membership.school_id && isSchoolRole(membership.role),
  );

  if (validMemberships.length === 0) {
    return [];
  }

  const schoolIds = Array.from(
    new Set(validMemberships.map((membership) => membership.school_id)),
  );

  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select("id, school_name, logo_url, city, semester_system")
    .in("id", schoolIds);

  if (schoolsError) {
    console.error("getUserSchoolMemberships schools error:", schoolsError);
    return [];
  }

  const schoolsById = new Map(
    ((schools ?? []) as SchoolRow[]).map((school) => [school.id, school]),
  );

  return validMemberships
    .map((membership): UserSchool | null => {
      const school = schoolsById.get(membership.school_id);

      if (!school) return null;

      return {
        id: school.id,
        school_name: school.school_name ?? "مدرسة بدون اسم",
        logo_url: school.logo_url ?? null,
        city: school.city ?? null,
        semester_system: school.semester_system ?? null,
        member_id: membership.id,
        role: membership.role as SchoolRole,
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