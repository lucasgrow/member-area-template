import { and, eq } from "drizzle-orm";

import { canAccessCourse } from "@/server/access";
import { courses, getDb, lessons, sections } from "@/server/db";

export type LessonAccessRow = {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  sectionId: string;
  sectionSlug: string;
  sectionTitle: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseRequiredTier: string;
  courseIsFree: boolean;
};

export function resolveLessonAccess(
  row: LessonAccessRow | null,
  membership: string | null | undefined,
) {
  if (!row) return null;
  const course = {
    id: row.courseId,
    slug: row.courseSlug,
    title: row.courseTitle,
    requiredTier: row.courseRequiredTier,
    isFree: row.courseIsFree,
  };
  if (!canAccessCourse(course, membership)) return null;
  return {
    lesson: { id: row.lessonId, slug: row.lessonSlug, title: row.lessonTitle },
    section: { id: row.sectionId, slug: row.sectionSlug, title: row.sectionTitle },
    course,
  };
}

export async function verifyLessonAccess(
  lessonId: string,
  membership: string | null | undefined,
) {
  const row = await getDb()
    .select({
      lessonId: lessons.id,
      lessonSlug: lessons.slug,
      lessonTitle: lessons.title,
      sectionId: sections.id,
      sectionSlug: sections.slug,
      sectionTitle: sections.title,
      courseId: courses.id,
      courseSlug: courses.slug,
      courseTitle: courses.title,
      courseRequiredTier: courses.requiredTier,
      courseIsFree: courses.isFree,
    })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .innerJoin(courses, eq(sections.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), eq(courses.status, "active")))
    .then((rows) => rows[0] ?? null);
  return resolveLessonAccess(row, membership);
}
