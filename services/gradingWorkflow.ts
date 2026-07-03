import { supabase } from "@/lib/supabase";
import type { SchoolRole } from "@/lib/permissions";
import { canGrade } from "./gradingPermissions";
import {
  hasBlockingIssues,
  validateGradeBookForAction,
  type GradeComponent,
  type GradeValueMap,
  type GradeValidationIssue,
} from "./gradingValidation";

export type GradeBookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "locked"
  | "reopened";

export type WorkflowAction = "submit" | "approve" | "lock" | "reopen";

export type GradeBookWorkflowRow = {
  id: string;
  school_id?: string | null;
  teacher_subject_id?: string | null;
  teacher_id?: string | null;
  subject_id?: string | null;
  classroom_id?: string | null;
  academic_year?: string | null;
  semester?: string | null;
  status: GradeBookStatus;
  components?: GradeComponent[] | null;
};

export type GradeEntryWorkflowRow = {
  id?: string;
  grade_book_id: string;
  student_id: string;
  values: GradeValueMap;
  total_score: number;
  max_score: number;
  percentage: number;
  grade_label: string;
  result_status: string;
};

export type WorkflowActor = {
  userId?: string | null;
  role?: SchoolRole | null;
};

export type WorkflowContext = {
  actor?: WorkflowActor;
  note?: string | null;
  expectedStudentCount?: number;
};

export type WorkflowValidationResult = {
  allowed: boolean;
  issues: GradeValidationIssue[];
};

const TRANSITIONS: Record<GradeBookStatus, GradeBookStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "reopened"],
  approved: ["locked", "reopened"],
  locked: ["reopened"],
  reopened: ["submitted"],
};

const ACTION_TARGET_STATUS: Record<WorkflowAction, GradeBookStatus> = {
  submit: "submitted",
  approve: "approved",
  lock: "locked",
  reopen: "reopened",
};

const ACTION_PERMISSION: Record<WorkflowAction, Parameters<typeof canGrade>[1]> =
  {
    submit: "edit",
    approve: "approve",
    lock: "lock",
    reopen: "reopen",
  };

function nowIso() {
  return new Date().toISOString();
}

function workflowError(message: string) {
  return new Error(message);
}

function isValidTransition(
  currentStatus: GradeBookStatus,
  nextStatus: GradeBookStatus,
) {
  return TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

function assertPermission(action: WorkflowAction, actor?: WorkflowActor) {
  const role = actor?.role ?? null;
  const permission = ACTION_PERMISSION[action];

  if (!canGrade(role, permission)) {
    throw workflowError("لا تملك الصلاحية المطلوبة لتنفيذ هذا الإجراء.");
  }
}

function assertTransition(
  currentStatus: GradeBookStatus,
  nextStatus: GradeBookStatus,
) {
  if (!isValidTransition(currentStatus, nextStatus)) {
    throw workflowError(
      `لا يمكن نقل سجل الدرجات من حالة "${currentStatus}" إلى "${nextStatus}".`,
    );
  }
}

function normalizeComponents(value?: GradeComponent[] | null): GradeComponent[] {
  return Array.isArray(value) ? value : [];
}

async function getGradeBook(gradeBookId: string): Promise<GradeBookWorkflowRow> {
  const { data, error } = await supabase
    .from("grade_books")
    .select("*")
    .eq("id", gradeBookId)
    .single();

  if (error) throw error;
  return data as GradeBookWorkflowRow;
}

async function getGradeEntries(
  gradeBookId: string,
): Promise<GradeEntryWorkflowRow[]> {
  const { data, error } = await supabase
    .from("grade_entries")
    .select("*")
    .eq("grade_book_id", gradeBookId);

  if (error) throw error;
  return (data ?? []) as GradeEntryWorkflowRow[];
}

function validateWorkflowAction(input: {
  action: WorkflowAction;
  book: GradeBookWorkflowRow;
  entries: GradeEntryWorkflowRow[];
  expectedStudentCount?: number;
}): WorkflowValidationResult {
  const issues: GradeValidationIssue[] = [];
  const nextStatus = ACTION_TARGET_STATUS[input.action];
  const components = normalizeComponents(input.book.components);

  if (!isValidTransition(input.book.status, nextStatus)) {
    issues.push({
      field: "status",
      level: "error",
      message: `انتقال الحالة غير مسموح من "${input.book.status}" إلى "${nextStatus}".`,
    });
  }

  if (input.action === "submit" || input.action === "approve" || input.action === "lock") {
    issues.push(
      ...validateGradeBookForAction({
        action: input.action,
        status: input.book.status,
        components,
        entries: input.entries.map((entry) => ({
          ...entry,
          components,
        })),
        expectedStudentCount: input.expectedStudentCount,
      }),
    );
  }

  if (input.action === "lock" && input.book.status !== "approved") {
    issues.push({
      field: "status",
      level: "error",
      message: "لا يمكن إقفال سجل الدرجات إلا بعد اعتماده.",
    });
  }

  if (input.action === "reopen" && input.book.status === "draft") {
    issues.push({
      field: "status",
      level: "error",
      message: "لا يمكن إعادة فتح سجل في حالة مسودة.",
    });
  }

  return {
    allowed: !hasBlockingIssues(issues),
    issues,
  };
}

async function writeWorkflowLog(input: {
  book: GradeBookWorkflowRow;
  status: GradeBookStatus;
  actorUserId?: string | null;
  note?: string | null;
  affectedCount?: number;
  issues?: GradeValidationIssue[];
}) {
  const payload = {
    grade_book_id: input.book.id,
    school_id: input.book.school_id ?? null,
    teacher_subject_id: input.book.teacher_subject_id ?? null,
    subject_id: input.book.subject_id ?? null,
    classroom_id: input.book.classroom_id ?? null,
    academic_year: input.book.academic_year ?? null,
    semester: input.book.semester ?? null,
    status: input.status,
    actor_user_id: input.actorUserId ?? null,
    note: input.note ?? null,
    affected_count: input.affectedCount ?? null,
    issues: input.issues ?? [],
  };

  const { error } = await supabase.from("grade_workflow_logs").insert(payload);

  if (error) {
    console.warn("grade_workflow_logs insert failed:", error.message);
  }
}

async function updateStatus(input: {
  gradeBookId: string;
  action: WorkflowAction;
  context?: WorkflowContext;
}) {
  const book = await getGradeBook(input.gradeBookId);
  const nextStatus = ACTION_TARGET_STATUS[input.action];

  assertPermission(input.action, input.context?.actor);
  assertTransition(book.status, nextStatus);

  const entries = await getGradeEntries(input.gradeBookId);

  const validation = validateWorkflowAction({
    action: input.action,
    book,
    entries,
    expectedStudentCount: input.context?.expectedStudentCount,
  });

  if (!validation.allowed) {
    const firstIssue = validation.issues.find((issue) => issue.level === "error");
    throw workflowError(
      firstIssue?.message || "لا يمكن تنفيذ الإجراء بسبب وجود أخطاء في سجل الدرجات.",
    );
  }

  const timestamp = nowIso();

  const payload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: timestamp,
  };

  if (nextStatus === "submitted") payload.submitted_at = timestamp;
  if (nextStatus === "approved") payload.approved_at = timestamp;
  if (nextStatus === "locked") payload.locked_at = timestamp;
  if (nextStatus === "reopened") payload.reopened_at = timestamp;

  const { data, error } = await supabase
    .from("grade_books")
    .update(payload)
    .eq("id", input.gradeBookId)
    .select()
    .single();

  if (error) throw error;

  await writeWorkflowLog({
    book,
    status: nextStatus,
    actorUserId: input.context?.actor?.userId ?? null,
    note: input.context?.note ?? null,
    affectedCount: entries.length,
    issues: validation.issues,
  });

  return data as GradeBookWorkflowRow;
}

export const GradingWorkflow = {
  canTransition: isValidTransition,

  validateAction(input: {
    action: WorkflowAction;
    book: GradeBookWorkflowRow;
    entries: GradeEntryWorkflowRow[];
    expectedStudentCount?: number;
  }) {
    return validateWorkflowAction(input);
  },

  submit(gradeBookId: string, context?: WorkflowContext) {
    return updateStatus({ gradeBookId, action: "submit", context });
  },

  approve(gradeBookId: string, context?: WorkflowContext) {
    return updateStatus({ gradeBookId, action: "approve", context });
  },

  lock(gradeBookId: string, context?: WorkflowContext) {
    return updateStatus({ gradeBookId, action: "lock", context });
  },

  reopen(gradeBookId: string, context?: WorkflowContext) {
    return updateStatus({ gradeBookId, action: "reopen", context });
  },

  async logs(gradeBookId: string) {
    const { data, error } = await supabase
      .from("grade_workflow_logs")
      .select("*")
      .eq("grade_book_id", gradeBookId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};

export default GradingWorkflow;
