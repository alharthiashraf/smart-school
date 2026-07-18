import type { QualityEvidence } from "@/types/quality";

type Raw = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function mapEvidence(row: Raw): QualityEvidence {
  return {
    id: text(row.id),
    school_id: text(row.school_id, "") || null,
    name: text(row.name, "شاهد بدون اسم"),
    type: text(row.type, "غير محدد"),
    indicator: text(row.indicator, ""),
    proves: text(row.proves, ""),
    impact: text(row.impact, ""),
    notes: text(row.notes, ""),
    uploaded_by: text(row.uploaded_by, ""),
    uploaded_at: text(row.uploaded_at, ""),
  };
}

export function mapEvidences(rows: Raw[]): QualityEvidence[] {
  return rows.map(mapEvidence);
}

