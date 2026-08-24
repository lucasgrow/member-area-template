import { and, asc, eq, sql } from "drizzle-orm";

import {
  courses,
  getDb,
  lessons,
  sections,
  userLessonProgress,
} from "@/server/db";

export async function getCourseStructure(courseId: string) {
  const db = getDb();
  const allSections = await db
    .select()
    .from(sections)
    .where(eq(sections.courseId, courseId))
    .orderBy(asc(sections.sortOrder));

  if (allSections.length === 0) return { sections: [], lessons: [] };

  const sectionIds = allSections.map((section) => section.id);
  const allLessons = await db
    .select({
      id: lessons.id,
      sectionId: lessons.sectionId,
      slug: lessons.slug,
      title: lessons.title,
      durationSeconds: lessons.durationSeconds,
      sortOrder: lessons.sortOrder,
    })
    .from(lessons)
    .where(
      sql`${lessons.sectionId} IN (${sql.join(
        sectionIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )
    .orderBy(asc(lessons.sortOrder));

  return { sections: allSections, lessons: allLessons };
}

export async function getUserProgressBulk(userId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return new Set<string>();

  const db = getDb();
  const rows = await db
    .select({ lessonId: userLessonProgress.lessonId })
    .from(userLessonProgress)
    .where(
      and(
        eq(userLessonProgress.userId, userId),
        eq(userLessonProgress.completed, true),
        sql`${userLessonProgress.lessonId} IN (${sql.join(
          lessonIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
    );

  return new Set(rows.map((row) => row.lessonId));
}

export async function getCoursesWithStats(userId: string) {
  const db = getDb();
  const allCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.status, "active"))
    .orderBy(asc(courses.sortOrder));

  if (allCourses.length === 0) {
    return {
      courses: allCourses,
      lessonsByCourse: new Map<string, { lessonId: string; durationSeconds: number | null }[]>(),
      completedByCourse: new Map<string, number>(),
    };
  }

  const courseIds = allCourses.map((course) => course.id);
  const allLessons = await db
    .select({
      lessonId: lessons.id,
      courseId: sections.courseId,
      durationSeconds: lessons.durationSeconds,
    })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .where(
      sql`${sections.courseId} IN (${sql.join(
        courseIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );

  const lessonsByCourse = new Map<string, { lessonId: string; durationSeconds: number | null }[]>();
  for (const lesson of allLessons) {
    const group = lessonsByCourse.get(lesson.courseId) ?? [];
    group.push({
      lessonId: lesson.lessonId,
      durationSeconds: lesson.durationSeconds,
    });
    lessonsByCourse.set(lesson.courseId, group);
  }

  const completedSet = await getUserProgressBulk(
    userId,
    allLessons.map((lesson) => lesson.lessonId),
  );

  const completedByCourse = new Map<string, number>();
  for (const [courseId, courseLessons] of lessonsByCourse.entries()) {
    completedByCourse.set(
      courseId,
      courseLessons.filter((lesson) => completedSet.has(lesson.lessonId)).length,
    );
  }

  return { courses: allCourses, lessonsByCourse, completedByCourse };
}
