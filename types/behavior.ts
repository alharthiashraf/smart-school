export type BehaviorRecord = {
  id: string;

  school_id: string | null;

  student_id: string;

  behavior_type: string;

  severity:
    | "low"
    | "medium"
    | "high";

  description?: string;

  action_taken?: string;

  teacher_id?: string | null;

  created_at?: string;
};
