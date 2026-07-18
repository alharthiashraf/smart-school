export type AuditAction = "create" | "update" | "delete" | "approve" | "lock" | "reopen" | "import" | "export" | "login" | "logout";

export type AuditEntry = {
  id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string | null;
  actor_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export const AuditEngine = {
  entry(input: Omit<AuditEntry, "id" | "created_at">): AuditEntry {
    return {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
  },

  diff(before: Record<string, unknown>, after: Record<string, unknown>) {
    const changed: Record<string, { before: unknown; after: unknown }> = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    keys.forEach((key) => {
      if (before[key] !== after[key]) changed[key] = { before: before[key], after: after[key] };
    });
    return changed;
  },
};

