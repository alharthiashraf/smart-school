export const AnalyticsEngine = {
  average(values: number[]) {
    const clean = values.filter(Number.isFinite);
    if (!clean.length) return 0;
    return Math.round((clean.reduce((sum, value) => sum + value, 0) / clean.length) * 100) / 100;
  },

  percentage(part: number, total: number) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  },

  min(values: number[]) {
    const clean = values.filter(Number.isFinite);
    return clean.length ? Math.min(...clean) : 0;
  },

  max(values: number[]) {
    const clean = values.filter(Number.isFinite);
    return clean.length ? Math.max(...clean) : 0;
  },

  distribution<T extends string | number>(values: T[]) {
    return values.reduce<Record<string, number>>((acc, value) => {
      const key = String(value);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  },
};

