export type ConflictSeverity = "low" | "medium" | "high";

export type Conflict<T = unknown> = {
  type: string;
  severity: ConflictSeverity;
  message: string;
  items: T[];
};

export const ConflictEngine = {
  duplicates<T>(items: T[], key: (item: T) => string, message: (items: T[]) => string, type = "duplicate"): Conflict<T>[] {
    const groups = new Map<string, T[]>();
    items.forEach((item) => {
      const k = key(item);
      groups.set(k, [...(groups.get(k) ?? []), item]);
    });

    return Array.from(groups.values())
      .filter((group) => group.length > 1)
      .map((group) => ({ type, severity: "high", message: message(group), items: group }));
  },
};
