export type ReportColumn<T> = {
  key: keyof T | string;
  header: string;
};

export type ReportDefinition<T> = {
  title: string;
  columns: ReportColumn<T>[];
  rows: T[];
  generated_at: string;
  metadata?: Record<string, unknown>;
};

export const ReportEngine = {
  build<T>(title: string, columns: ReportColumn<T>[], rows: T[], metadata?: Record<string, unknown>): ReportDefinition<T> {
    return {
      title,
      columns,
      rows,
      metadata,
      generated_at: new Date().toISOString(),
    };
  },

  summarize<T>(rows: T[], reducers: Record<string, (rows: T[]) => unknown>) {
    return Object.fromEntries(Object.entries(reducers).map(([key, reducer]) => [key, reducer(rows)]));
  },
};

