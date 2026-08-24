import Link from "next/link";

import { getCoursesWithStats } from "@/server/course-queries";
import { requireMemberPage } from "@/server/member-session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireMemberPage();
  const result = await getCoursesWithStats(session.user.id);
  const totalLessons = Array.from(result.lessonsByCourse.values()).reduce(
    (total, lessons) => total + lessons.length,
    0,
  );
  const completedLessons = Array.from(result.completedByCourse.values()).reduce(
    (total, completed) => total + completed,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="text-sm text-default-500">Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold">{session.user.name ?? "Student"}</h1>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-divider bg-content1 p-5">
          <p className="text-sm text-default-500">Membership</p>
          <p className="mt-2 text-xl font-semibold uppercase">{session.user.membership}</p>
        </div>
        <div className="rounded-lg border border-divider bg-content1 p-5">
          <p className="text-sm text-default-500">Available courses</p>
          <p className="mt-2 text-xl font-semibold">{result.courses.length}</p>
        </div>
        <div className="rounded-lg border border-divider bg-content1 p-5">
          <p className="text-sm text-default-500">Lesson progress</p>
          <p className="mt-2 text-xl font-semibold">{completedLessons} / {totalLessons}</p>
        </div>
      </div>
      <Link
        href="/courses"
        className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 font-medium text-primary-foreground"
      >
        Browse courses
      </Link>
    </div>
  );
}
