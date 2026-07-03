import { supabase } from "@/lib/supabase";

export type DashboardStats = {
  schools: number;
  teachers: number;
  students: number;
  subjects: number;
};

async function getCount(table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`Dashboard count error (${table}):`, error);
    return 0;
  }

  return count ?? 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [schools, teachers, students, subjects] = await Promise.all([
    getCount("schools"),
    getCount("teachers"),
    getCount("students"),
    getCount("subjects"),
  ]);

  return { schools, teachers, students, subjects };
}