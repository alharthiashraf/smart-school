"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceRecord } from "@/types/attendance";
import { AttendanceService } from "@/services/attendance.service";
import { todayISO } from "@/lib/utils/dates";

type UseAttendanceReturn = {
  data: AttendanceRecord[];
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadByDate: (date?: string) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
};

export function useAttendance(
  schoolId?: string,
  autoLoad = true,
): UseAttendanceReturn {
  const mounted = useRef(false);

  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await AttendanceService.getAll(schoolId);

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
        err instanceof Error ? err.message : "تعذر تحميل بيانات الحضور.",
      );
      setData([]);
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [schoolId]);

  const loadByDate = useCallback(
    async (date = selectedDate) => {
      if (!mounted.current) return;

      setLoading(true);
      setError(null);

      try {
        const result = await AttendanceService.getByDate(date, schoolId);

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
          err instanceof Error
            ? err.message
            : "تعذر تحميل حضور اليوم المحدد.",
        );
        setData([]);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    },
    [schoolId, selectedDate],
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

  const stats = useMemo(() => {
    const total = data.length;
    const present = data.filter((item) => item.status === "present").length;
    const absent = data.filter((item) => item.status === "absent").length;
    const late = data.filter((item) => item.status === "late").length;
    const excused = data.filter((item) => item.status === "excused").length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      attendanceRate: total ? Math.round((present / total) * 100) : 0,
    };
  }, [data]);

  return {
    data,
    selectedDate,
    setSelectedDate,
    stats,
    loading,
    error,
    refresh: load,
    loadByDate,
    setData,
  };
}