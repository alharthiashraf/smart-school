import type { QualityEvidence } from "@/types/quality";
import { analyzeEvidence } from "@/lib/ai/evidenceAI";

export function getQualityAnalytics(records: QualityEvidence[]) {
  const analysis = analyzeEvidence({
    items: records.map((record) => ({
      id: record.id,
      name: record.name,
      type: record.type,
      proves: record.proves,
      impact: record.impact,
      notes: record.notes,
      hasDate: Boolean(record.uploaded_at),
      hasOwner: Boolean(record.uploaded_by),
      hasResult: Boolean(record.impact),
      hasSignature: false,
      hasVisualProof: false,
    })),
  });

  return {
    total: records.length,
    readiness: analysis.readiness,
    averageScore: analysis.averageScore,
    strong: analysis.rows.filter((row) => row.strength === "قوي").length,
    medium: analysis.rows.filter((row) => row.strength === "متوسط").length,
    weak: analysis.rows.filter((row) => row.strength === "ضعيف").length,
    missingEvidence: analysis.missingEvidence,
    urgentImprovements: analysis.urgentImprovements,
  };
}