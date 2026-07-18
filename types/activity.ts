export type Activity = {
  id: string;

  school_id?: string | null;

  title: string;

  category?: string;

  start_date?: string;

  end_date?: string;

  supervisor?: string;

  status?:
    | "planned"
    | "running"
    | "completed";
};
