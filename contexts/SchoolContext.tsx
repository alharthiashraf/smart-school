"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";

import {
  can,
  canAll,
  canAny,
  getRolePermissions,
  getUserSchoolMemberships,
  resolveCurrentSchool,
  type PermissionKey,
  type SchoolRole,
  type UserSchool,
} from "@/lib/permissions";

type Semester =
  | "الفصل الدراسي الأول"
  | "الفصل الدراسي الثاني"
  | "الفصل الدراسي الثالث";

type SchoolContextValue = {
  currentSchool: UserSchool | null;
  schools: UserSchool[];
  currentRole: SchoolRole | null;
  permissions: PermissionKey[];
  academicYear: string;
  semester: Semester;
  semesterSystem: string | null;
  loading: boolean;
  refreshSchools: () => Promise<void>;
  switchSchool: (schoolId: string) => void;
  switchSemester: (semester: Semester) => void;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
};

const SchoolContext = createContext<SchoolContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  schoolId: "current_school_id",
  academicYear: "current_academic_year",
  semester: "current_semester",
};

function getDefaultAcademicYear() {
  return "1447";
}

function getDefaultSemester(): Semester {
  return "الفصل الدراسي الأول";
}

function isSemester(value: string | null): value is Semester {
  return (
    value === "الفصل الدراسي الأول" ||
    value === "الفصل الدراسي الثاني" ||
    value === "الفصل الدراسي الثالث"
  );
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [schools, setSchools] = useState<UserSchool[]>([]);
  const [currentSchool, setCurrentSchool] = useState<UserSchool | null>(null);
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear);
  const [semester, setSemester] = useState<Semester>(getDefaultSemester);
  const [loading, setLoading] = useState(true);

  const refreshSchools = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setSchools([]);
      setCurrentSchool(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const memberships = await getUserSchoolMemberships();

      const storedSchoolId =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEYS.schoolId)
          : null;

      const selectedSchool = resolveCurrentSchool(memberships, storedSchoolId);

      setSchools(memberships);
      setCurrentSchool(selectedSchool);

      if (selectedSchool && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.schoolId, selectedSchool.id);
      }
    } catch (error) {
      console.error("SchoolContext refreshSchools error:", error);
      setSchools([]);
      setCurrentSchool(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const switchSchool = useCallback(
    (schoolId: string) => {
      const selectedSchool = schools.find((school) => school.id === schoolId);

      if (!selectedSchool) return;

      setCurrentSchool(selectedSchool);

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEYS.schoolId, selectedSchool.id);
      }
    },
    [schools],
  );

  const switchSemester = useCallback((nextSemester: Semester) => {
    setSemester(nextSemester);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.semester, nextSemester);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedAcademicYear = localStorage.getItem(STORAGE_KEYS.academicYear);
    const storedSemester = localStorage.getItem(STORAGE_KEYS.semester);

    if (storedAcademicYear) {
      setAcademicYear(storedAcademicYear);
    }

    if (isSemester(storedSemester)) {
      setSemester(storedSemester);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?.id) {
      setSchools([]);
      setCurrentSchool(null);
      setLoading(false);
      return;
    }

    void refreshSchools();
  }, [authLoading, isAuthenticated, user?.id, refreshSchools]);

  const currentRole = currentSchool?.role ?? null;

  const permissions = useMemo(
    () => getRolePermissions(currentRole),
    [currentRole],
  );

  const value = useMemo<SchoolContextValue>(
    () => ({
      currentSchool,
      schools,
      currentRole,
      permissions,
      academicYear,
      semester,
      semesterSystem: currentSchool?.semester_system ?? null,
      loading: authLoading || loading,
      refreshSchools,
      switchSchool,
      switchSemester,
      hasPermission: (permission) => can(currentRole, permission),
      hasAnyPermission: (items) => canAny(currentRole, items),
      hasAllPermissions: (items) => canAll(currentRole, items),
    }),
    [
      currentSchool,
      schools,
      currentRole,
      permissions,
      academicYear,
      semester,
      authLoading,
      loading,
      refreshSchools,
      switchSchool,
      switchSemester,
    ],
  );

  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);

  if (!context) {
    throw new Error("useSchool must be used inside SchoolProvider");
  }

  return context;
}