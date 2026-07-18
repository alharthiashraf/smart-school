"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GradeRecord } from "@/types/grade";
import { GradesService } from "@/services/grades.service";
import { getGradeLabel, getResultStatus } from "@/constants/grades";
import { includesArabic } from "@/lib/utils/strings";

type RawGrade = Record<string, unknown>;

type UseGradesReturn = {
  data: GradeRecord[];
  enriched: (GradeRecord & { percentage: number })[];
  filtered: (GradeRecord & { percentage: number })[];
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  stats: {
    total: number;
    average: number;
    passed: number;
    weak: number;
    passRate: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadByStudent: (studentId: string) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<GradeRecord[]>>;
};

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeGrade(row: RawGrade, schoolId?: string): GradeRecord {
  const score = toNumber(row.score, 0);
  const max_score = toNumber(row.max_score, 100);

  return {
    id: toText(row.id),
    school_id: toText(row.school_id, schoolId ?? ""),
    student_id: toText(row.student_id),
    subject_name: toText(row.subject_name, "غير محدد"),
    score,
    max_score,
    semester: toText(row.semester),
    academic_year: toText(row.academic_year),
    grade_label: row.grade_label as GradeRecord["grade_label"],
    result_status: row.result_status as GradeRecord["result_status"],
    created_at: row.created_at as GradeRecord["created_at"],
  };
}

export function useGrades(
  schoolId?: string,
  autoLoad = true,
): UseGradesReturn {
  const mounted = useRef(false);

  const [data, setData] = useState<GradeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await GradesService.getAll(schoolId);

      if (!mounted.current) return;

      if (result.error) {
        setError(result.error);
        setData([]);
      } else {
        setData(
          ((result.data ?? []) as RawGrade[]).map((row) =>
            normalizeGrade(row, schoolId),
          ),
        );
      }
    } catch (err) {
      if (!mounted.current) return;

      setError(
        err instanceof Error ? err.message : "تعذر تحميل بيانات الدرجات.",
      );
      setData([]);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [schoolId]);

  const loadByStudent = useCallback(
    async (studentId: string) => {
      if (!mounted.current) return;

      setLoading(true);
      setError(null);

      try {
        const result = await GradesService.getByStudent({
          schoolId: schoolId ?? "",
          studentId,
        });

        if (!mounted.current) return;

        if (result.error) {
          setError(result.error);
          setData([]);
        } else {
          setData(
            ((result.data ?? []) as RawGrade[]).map((row) =>
              normalizeGrade(row, schoolId),
            ),
          );
        }
      } catch (err) {
        if (!mounted.current) return;

        setError(
          err instanceof Error ? err.message : "تعذر تحميل درجات الطالب.",
        );
        setData([]);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [schoolId],
  );

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

  const enriched = useMemo(() => {
    return data.map((item) => {
      const percentage =
        item.max_score > 0
          ? Math.round((item.score / item.max_score) * 100)
          : 0;

      return {
        ...item,
        percentage,
        grade_label: item.grade_label ?? getGradeLabel(percentage),
        result_status: item.result_status ?? getResultStatus(percentage),
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const keyword = search.trim();

    if (!keyword) return enriched;

    return enriched.filter((grade) =>
      [grade.subject_name, grade.semester, grade.academic_year]
        .filter(Boolean)
        .some((value) => includesArabic(String(value), keyword)),
    );
  }, [enriched, search]);

  const stats = useMemo(() => {
    const total = enriched.length;

    const average =
      total > 0
        ? Math.round(
            enriched.reduce((sum, item) => sum + item.percentage, 0) / total,
          )
        : 0;

    const passed = enriched.filter(
      (item) => item.result_status === "ناجح",
    ).length;

    const weak = enriched.filter((item) => item.percentage < 60).length;

    return {
      total,
      average,
      passed,
      weak,
      passRate: total ? Math.round((passed / total) * 100) : 0,
    };
  }, [enriched]);

  return {
    data,
    enriched,
    filtered,
    search,
    setSearch,
    stats,
    loading,
    error,
    refresh: load,
    loadByStudent,
    setData,
  };
}
