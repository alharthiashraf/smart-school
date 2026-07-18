export type ImportedScheduleRow = {
  teacherName: string;
  subjectName: string;
  classroomName: string;
  dayName: string;
  periodNumber: number;
  roomName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

const TEACHER_KEYS = ["المعلم", "اسم المعلم", "teacher", "teacher name"];
const SUBJECT_KEYS = ["المادة", "اسم المادة", "subject", "subject name"];
const CLASSROOM_KEYS = ["الفصل", "الشعبة", "classroom", "class"];
const DAY_KEYS = ["اليوم", "day"];
const PERIOD_KEYS = ["الحصة", "رقم الحصة", "period", "period number"];
const ROOM_KEYS = ["القاعة", "الغرفة", "room"];
const START_KEYS = ["بداية الحصة", "البداية", "start", "start_time"];
const END_KEYS = ["نهاية الحصة", "النهاية", "end", "end_time"];

function pick(row: Record<string, unknown>, keys: string[]) {
  const found = Object.keys(row).find((key) => keys.some((target) => key.trim().toLowerCase() === target.toLowerCase()));
  return found ? String(row[found] ?? "").trim() : "";
}

export const ScheduleImportService = {
  normalizeRows(rows: Record<string, unknown>[]): ImportedScheduleRow[] {
    return rows
      .map((row) => ({
        teacherName: pick(row, TEACHER_KEYS),
        subjectName: pick(row, SUBJECT_KEYS),
        classroomName: pick(row, CLASSROOM_KEYS),
        dayName: pick(row, DAY_KEYS),
        periodNumber: Number(pick(row, PERIOD_KEYS)),
        roomName: pick(row, ROOM_KEYS) || null,
        startTime: pick(row, START_KEYS) || null,
        endTime: pick(row, END_KEYS) || null,
      }))
      .filter((row) => row.teacherName && row.subjectName && row.dayName && Number.isFinite(row.periodNumber) && row.periodNumber > 0);
  },
};

