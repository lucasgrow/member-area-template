import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { canAccessCourse, normalizeTier } from "@/server/access";
import { getCourseStructure, getUserProgressBulk } from "@/server/course-queries";
import { courses, getDb } from "@/server/db";
import { requireMemberPage } from "@/server/member-session";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const session = await requireMemberPage();
  const course = await getDb()
    .select()
    .from(courses)
    .where(and(eq(courses.slug, courseSlug), eq(courses.status, "active")))
    .then((rows) => rows[0] ?? null);
  if (!course) notFound();

  const membership = normalizeTier(session.user.membership);
  const unlocked = canAccessCourse(course, membership);
  const structure = await getCourseStructure(course.id);
  const completed = await getUserProgressBulk(
    session.user.id,
    structure.lessons.map((lesson) => lesson.id),
  );
  const sections = structure.sections.map((section) => ({
    ...section,
    lessons: structure.lessons.filter((lesson) => lesson.sectionId === section.id),
  }));
  const firstSection = sections.find((section) => section.lessons.length > 0);
  const firstLesson = firstSection?.lessons[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-4 border-b border-divider pb-6">
        <Link href="/courses" className="text-sm text-default-500 hover:text-foreground">Courses</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold">{course.title}</h1>
            {course.description ? <p className="mt-3 text-default-500">{course.description}</p> : null}
          </div>
          <span className={`rounded-md px-3 py-1 text-sm font-medium ${unlocked ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"}`}>
            {unlocked ? "Included" : `Requires ${course.requiredTier}`}
          </span>
        </div>
        {unlocked && firstLesson && firstSection ? (
          <Link
            href={`/courses/${course.slug}/${firstSection.slug}/${firstLesson.slug}`}
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
          >
            Start course
          </Link>
        ) : null}
      </header>

      {!unlocked ? (
        <div className="rounded-lg border border-warning-200 bg-warning-50 p-5 text-warning-800">
          Your {membership} membership does not include this course. Upgrade to {course.requiredTier} or higher to open lesson content.
        </div>
      ) : null}

      <div className="space-y-7">
        {sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-divider p-8 text-center text-default-500">
            This course has no lessons yet.
          </div>
        ) : sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              {section.description ? <p className="text-sm text-default-500">{section.description}</p> : null}
            </div>
            <div className="divide-y divide-divider rounded-lg border border-divider bg-content1">
              {section.lessons.length === 0 ? (
                <p className="p-4 text-sm text-default-500">No lessons in this section.</p>
              ) : section.lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${course.slug}/${section.slug}/${lesson.slug}`}
                  className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-default-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-default-400">{index + 1}</span>
                    <span className="font-medium">{lesson.title}</span>
                  </span>
                  <span className="text-xs text-default-500">
                    {!unlocked ? "Locked" : completed.has(lesson.id) ? "Completed" : "Open"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
