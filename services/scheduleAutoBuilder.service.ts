import type { ScheduleLite } from "./scheduleConflict.service";
import { ScheduleConflictService } from "./scheduleConflict.service";

export type AssignmentForAutoSchedule = {
  id: string;
  teacher_id: string;
  classroom_id: string | null;
  weekly_periods?: number;
};

export type AutoScheduleOptions = {
  days: string[];
  periodsPerDay: number;
  startTime?: string;
  periodMinutes?: number;
  breakMinutes?: number;
};

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, h || 7, m || 0);
  date.setMinutes(date.getMinutes() + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function slotTime(period: number, options: AutoScheduleOptions) {
  const startBase = options.startTime || "07:00";
  const periodMinutes = options.periodMinutes ?? 45;
  const breakMinutes = options.breakMinutes ?? 5;
  const start = addMinutes(startBase, (period - 1) * (periodMinutes + breakMinutes));
  const end = addMinutes(start, periodMinutes);
  return { start, end };
}

export const ScheduleAutoBuilderService = {
  build(assignments: AssignmentForAutoSchedule[], options: AutoScheduleOptions) {
    const generated: Array<ScheduleLite & { start_time: string; end_time: string }> = [];
    const ordered = [...assignments].sort((a, b) => String(a.teacher_id).localeCompare(String(b.teacher_id)));

    for (const assignment of ordered) {
      const count = Math.max(1, Number(assignment.weekly_periods ?? 1));
      let placed = 0;

      for (const day of options.days) {
        if (placed >= count) break;

        for (let period = 1; period <= options.periodsPerDay; period += 1) {
          if (placed >= count) break;

          const candidate: ScheduleLite = {
            teacher_subject_id: assignment.id,
            teacher_id: assignment.teacher_id,
            classroom_id: assignment.classroom_id,
            day_name: day,
            period_number: period,
            room_name: null,
          };

          const conflicts = ScheduleConflictService.detect([...generated, candidate]);
          if (conflicts.length === 0) {
            const time = slotTime(period, options);
            generated.push({ ...candidate, start_time: time.start, end_time: time.end });
            placed += 1;
          }
        }
      }
    }

    return generated;
  },
};
