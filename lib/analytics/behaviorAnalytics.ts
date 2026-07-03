import type { BehaviorRecord } from "@/types/behavior";

export function getBehaviorAnalytics(records: BehaviorRecord[]) {
  const total = records.length;

  const low = records.filter((record) => record.severity === "low").length;
  const medium = records.filter((record) => record.severity === "medium").length;
  const high = records.filter((record) => record.severity === "high").length;

  const byType = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.behavior_type] = (acc[record.behavior_type] || 0) + 1;
    return acc;
  }, {});

  const mostRepeated = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    total,
    low,
    medium,
    high,
    byType,
    mostRepeated,
    riskLevel: high > 0 ? "مرتفع" : medium >= 3 ? "متوسط" : "منخفض",
  };
}