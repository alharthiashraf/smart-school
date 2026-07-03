export type AttendanceInput = {
  studentName?: string;
  status: "present" | "absent" | "late" | "excused" | string;
};

export function analyzeAttendance(rows: AttendanceInput[]) {
  const total = rows.length;
  const present = rows.filter((row) => row.status === "present").length;
  const absent = rows.filter((row) => row.status === "absent").length;
  const late = rows.filter((row) => row.status === "late").length;
  const excused = rows.filter((row) => row.status === "excused").length;

  const attendanceRate = total ? Math.round((present / total) * 100) : 0;

  const riskLevel =
    attendanceRate >= 90 ? "منخفض" : attendanceRate >= 75 ? "متوسط" : "مرتفع";

  return {
    total,
    present,
    absent,
    late,
    excused,
    attendanceRate,
    riskLevel,
    summary:
      riskLevel === "منخفض"
        ? "مؤشر الحضور جيد ومستقر."
        : riskLevel === "متوسط"
          ? "مؤشر الحضور يحتاج إلى متابعة وتحليل أسباب الغياب والتأخر."
          : "مؤشر الحضور مرتفع الخطورة ويحتاج إلى تدخل عاجل.",
    recommendations:
      riskLevel === "منخفض"
        ? [
            "الاستمرار في المتابعة اليومية.",
            "تعزيز الطلاب المنتظمين.",
          ]
        : [
            "حصر الطلاب المتكررين في الغياب.",
            "التواصل مع أولياء الأمور.",
            "إعداد خطة متابعة أسبوعية.",
            "تحليل أسباب الغياب والتأخر.",
          ],
  };
}