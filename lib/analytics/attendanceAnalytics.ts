import type { AttendanceRecord } from "@/types/attendance";

export function getAttendanceAnalytics(records: AttendanceRecord[]) {
  const total = records.length;

  const present = records.filter((r) => r.status === "present").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const late = records.filter((r) => r.status === "late").length;
  const excused = records.filter((r) => r.status === "excused").length;

  const attendanceRate = total ? Math.round((present / total) * 100) : 0;
  const absenceRate = total ? Math.round((absent / total) * 100) : 0;

  return {
    total,
    present,
    absent,
    late,
    excused,
    attendanceRate,
    absenceRate,
    riskLevel:
      attendanceRate >= 90 ? "منخفض" : attendanceRate >= 75 ? "متوسط" : "مرتفع",
  };
}
