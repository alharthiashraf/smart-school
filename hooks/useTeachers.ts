"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Teacher } from "@/types/teacher";
import { TeachersService } from "@/services/teachers.service";
import { includesArabic } from "@/lib/utils/strings";

type UseTeachersReturn = {
  data: Teacher[];
  filtered: Teacher[];
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<Teacher[]>>;
};

export function useTeachers(
  schoolId?: string,
  autoLoad = true,
): UseTeachersReturn {
  const mounted = useRef(false);

  const [data, setData] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await TeachersService.getAll(schoolId);

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
        err instanceof Error ? err.message : "تعذر تحميل بيانات المعلمين.",
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

    return data.filter((teacher) =>
      [
        teacher.full_name,
        teacher.email,
        teacher.specialization,
        teacher.phone,
        teacher.national_id,
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