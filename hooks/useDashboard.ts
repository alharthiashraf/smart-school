"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardStats } from "@/types/dashboard";
import { DashboardService } from "@/services/dashboard.service";
import { analyzeDashboard } from "@/lib/ai/dashboardAI";

type UseDashboardReturn = {
  stats: DashboardStats | null;
  ai: ReturnType<typeof analyzeDashboard>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useDashboard(
  schoolId?: string,
  autoLoad = true,
): UseDashboardReturn {
  const mounted = useRef(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await DashboardService.getStats(schoolId);

      if (!mounted.current) return;

      if (result.error) {
        setError(result.error);
        setStats(null);
      } else {
        setStats(result.data ?? null);
      }
    } catch (err) {
      if (!mounted.current) return;

      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحميل بيانات لوحة التحكم.",
      );
      setStats(null);
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

  const ai = useMemo(() => {
    return analyzeDashboard({
      attendanceRate: stats?.attendanceRate,
      averageGrade: stats?.averageGrade,
      openAlerts: stats?.openAlerts,
    });
  }, [stats]);

  return {
    stats,
    ai,
    loading,
    error,
    refresh: load,
  };
}
