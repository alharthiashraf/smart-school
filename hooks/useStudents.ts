"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Student } from "@/types/student";
import { StudentsService } from "@/services/students.service";
import { includesArabic } from "@/lib/utils/strings";

type UseStudentsReturn = {
  data: Student[];
  filtered: Student[];
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<Student[]>>;
};

export function useStudents(
  schoolId?: string,
  autoLoad = true,
): UseStudentsReturn {
  const mounted = useRef(false);

  const [data, setData] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await StudentsService.getAll(schoolId);

      if (!mounted.current) return;

      if (result.error) {
        setError(result.error);
        setData([]);
      } else {
        setData(result.data ?? []);
      }
    } catch (err) {
      if (!mounted.current) return;

      setError(
        err instanceof Error ? err.message : "تعذر تحميل بيانات الطلاب.",
      );
      setData([]);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [schoolId]);

  useEffect(() => {
    mounted.current = true;

    if (autoLoad) {
      queueMicrotask(() => {
        void load();
      });
    }

    return () => {
      mounted.current = false;
    };
  }, [autoLoad, load]);

  const filtered = useMemo(() => {
    const keyword = search.trim();

    if (!keyword) return data;

    return data.filter((student) =>
      [
        student.full_name,
        student.national_id,
        student.grade_name,
        student.classroom_name,
        student.guardian_email,
      ]
        .filter(Boolean)
        .some((value) => includesArabic(String(value), keyword)),
    );
  }, [data, search]);

  return {
    data,
    filtered,
    search,
    setSearch,
    loading,
    error,
    refresh: load,
    setData,
  };
}