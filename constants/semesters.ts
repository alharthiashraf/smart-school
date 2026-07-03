// constants/semesters.ts

export const allSemesters = [
  "الفصل الدراسي الأول",
  "الفصل الدراسي الثاني",
  "الفصل الدراسي الثالث",
] as const;

export type Semester = (typeof allSemesters)[number];

export const defaultSemester: Semester = "الفصل الدراسي الأول";

export type SemesterSystem = 2 | 3;

export function getSemestersBySystem(system?: SemesterSystem | null): readonly Semester[] {
  if (system === 2) {
    return [
      "الفصل الدراسي الأول",
      "الفصل الدراسي الثاني",
    ];
  }

  return allSemesters;
}

export function isSemester(value: unknown): value is Semester {
  return (
    typeof value === "string" &&
    allSemesters.includes(value as Semester)
  );
}