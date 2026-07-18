export type ScheduleConflictType = "teacher" | "classroom" | "room" | "duplicate";

export type ScheduleLite = {
  id?: string;
  teacher_subject_id: string;
  teacher_id?: string | null;
  classroom_id?: string | null;
  day_name: string;
  period_number: number;
  room_name?: string | null;
};

export type ScheduleConflict = {
  type: ScheduleConflictType;
  title: string;
  description: string;
  day_name: string;
  period_number: number;
  itemIds: string[];
};

function sameSlot(a: ScheduleLite, b: ScheduleLite) {
  return a.day_name === b.day_name && Number(a.period_number) === Number(b.period_number);
}

function hasRoom(value?: string | null) {
  return Boolean(String(value ?? "").trim());
}

export const ScheduleConflictService = {
  detect(items: ScheduleLite[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        if (!sameSlot(a, b)) continue;

        const ids = [a.id ?? `new-${i}`, b.id ?? `new-${j}`];

        if (a.teacher_subject_id && a.teacher_subject_id === b.teacher_subject_id) {
          conflicts.push({
            type: "duplicate",
            title: "تكرار نفس الإسناد",
            description: "نفس إسناد المعلم والمادة موجود في نفس اليوم والحصة.",
            day_name: a.day_name,
            period_number: a.period_number,
            itemIds: ids,
          });
        }

        if (a.teacher_id && b.teacher_id && a.teacher_id === b.teacher_id) {
          conflicts.push({
            type: "teacher",
            title: "تعارض معلم",
            description: "المعلم لديه أكثر من حصة في نفس اليوم ونفس رقم الحصة.",
            day_name: a.day_name,
            period_number: a.period_number,
            itemIds: ids,
          });
        }

        if (a.classroom_id && b.classroom_id && a.classroom_id === b.classroom_id) {
          conflicts.push({
            type: "classroom",
            title: "تعارض فصل",
            description: "الفصل لديه أكثر من مادة في نفس اليوم ونفس رقم الحصة.",
            day_name: a.day_name,
            period_number: a.period_number,
            itemIds: ids,
          });
        }

        if (hasRoom(a.room_name) && hasRoom(b.room_name) && String(a.room_name).trim() === String(b.room_name).trim()) {
          conflicts.push({
            type: "room",
            title: "تعارض قاعة",
            description: "القاعة مستخدمة في أكثر من حصة في نفس الوقت.",
            day_name: a.day_name,
            period_number: a.period_number,
            itemIds: ids,
          });
        }
      }
    }

    return conflicts;
  },
};

