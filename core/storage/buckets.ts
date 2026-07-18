import type { StorageBucketKey } from "./storage.types";

export const StorageBuckets: Record<StorageBucketKey, string> = {
  SCHOOL_LOGOS: "school-logos",
  STUDENT_PHOTOS: "student-photos",
  TEACHER_PHOTOS: "teacher-photos",
  TEACHER_FILES: "teacher-files",
  STUDENT_FILES: "student-files",
  BEHAVIOR_FILES: "behavior-files",
  HEALTH_FILES: "health-files",
  GUIDANCE_FILES: "guidance-files",
  ACTIVITY_FILES: "activity-files",
  REPORTS: "reports",
  IMPORTS: "imports",
  EXPORTS: "exports",
  TEMP: "temp",
};

export const PUBLIC_BUCKETS = new Set<string>([
  StorageBuckets.SCHOOL_LOGOS,
  StorageBuckets.STUDENT_PHOTOS,
  StorageBuckets.TEACHER_PHOTOS,
]);

export const PRIVATE_BUCKETS = new Set<string>([
  StorageBuckets.TEACHER_FILES,
  StorageBuckets.STUDENT_FILES,
  StorageBuckets.BEHAVIOR_FILES,
  StorageBuckets.HEALTH_FILES,
  StorageBuckets.GUIDANCE_FILES,
  StorageBuckets.ACTIVITY_FILES,
  StorageBuckets.REPORTS,
  StorageBuckets.IMPORTS,
  StorageBuckets.EXPORTS,
  StorageBuckets.TEMP,
]);

export function isPublicBucket(bucket: string) {
  return PUBLIC_BUCKETS.has(bucket);
}

export function isKnownBucket(bucket: string) {
  return Object.values(StorageBuckets).includes(bucket);
}

