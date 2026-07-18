"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QualityEvidence } from "@/types/quality";
import { QualityService } from "@/services/quality.service";
import { analyzeEvidence } from "@/lib/ai/evidenceAI";
import { includesArabic } from "@/lib/utils/strings";

type UseQualityReturn = {
  data: QualityEvidence[];
  filtered: QualityEvidence[];
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  ai: ReturnType<typeof analyzeEvidence>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<QualityEvidence[]>>;
};

export function useQuality(
  schoolId?: string,
  autoLoad = true,
): UseQualityReturn {
  const mounted = useRef(false);

  const [data, setData] = useState<QualityEvidence[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!mounted.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await QualityService.getAll(schoolId);

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
        err instanceof Error ? err.message : "تعذر تحميل شواهد الجودة.",
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

    return data.filter((item) =>
      [item.name, item.type, item.indicator, item.proves, item.impact]
        .filter(Boolean)
        .some((value) => includesArabic(String(value), keyword)),
    );
  }, [data, search]);

  const ai = useMemo(() => {
    return analyzeEvidence({
      items: data.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        proves: item.proves,
        impact: item.impact,
        notes: item.notes,
        hasDate: Boolean(item.uploaded_at),
        hasOwner: Boolean(item.uploaded_by),
        hasResult: Boolean(item.impact),
        hasSignature: false,
        hasVisualProof: false,
      })),
    });
  }, [data]);

  return {
    data,
    filtered,
    search,
    setSearch,
    ai,
    loading,
    error,
    refresh: load,
    setData,
  };
}
