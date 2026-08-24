import Link from "next/link";

import { canAccessCourse, normalizeTier } from "@/server/access";
import { getCoursesWithStats } from "@/server/course-queries";
import { requireMemberPage } from "@/server/member-session";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number) {
  if (seconds <= 0) return "Self-paced";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default async function CoursesPage() {
  const session = await requireMemberPage();
  const membership = normalizeTier(session.user.membership);
  const result = await getCoursesWithStats(session.user.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="mt-1 text-sm text-default-500">Your current plan is {membership}.</p>
        </div>
        <span className="rounded-md border border-divider px-3 py-1 text-xs font-medium uppercase">
          {membership}
        </span>
      </header>

      {result.courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-divider p-10 text-center text-default-500">
          No active courses are available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.courses.map((course) => {
            const courseLessons = result.lessonsByCourse.get(course.id) ?? [];
            const completed = result.completedByCourse.get(course.id) ?? 0;
            const progress = courseLessons.length > 0
              ? Math.round((completed / courseLessons.length) * 100)
              : 0;
            const unlocked = canAccessCourse(course, membership);
            const duration = courseLessons.reduce(
              (total, lesson) => total + (lesson.durationSeconds ?? 0),
              0,
            );

            return (
              <article key={course.id} className="flex min-h-64 flex-col rounded-lg border border-divider bg-content1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-default-500">
                      {course.level ?? "All levels"}
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">{course.title}</h2>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs font-medium ${unlocked ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"}`}>
                    {unlocked ? "Available" : `${course.requiredTier}+`}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-default-500">
                  {course.description ?? "Course description coming soon."}
                </p>
                <div className="mt-auto space-y-3 pt-6">
                  <div className="flex justify-between text-xs text-default-500">
                    <span>{courseLessons.length} lessons</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-default-100" aria-label={`${progress}% complete`}>
                    <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="inline-flex min-h-10 items-center font-medium text-primary hover:underline"
                  >
                    {unlocked ? "Open course" : "View access requirements"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
