import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExercisePanel } from "@/components/courses/exercise-panel";
import { LessonActions } from "@/components/courses/lesson-actions";
import { LessonVideo } from "@/components/courses/lesson-video";
import { canAccessCourse, normalizeTier } from "@/server/access";
import { getCourseStructure } from "@/server/course-queries";
import {
  courses,
  getDb,
  lessonAttachments,
  lessonChapters,
  lessons,
  lessonTranscripts,
  sections,
  userLessonProgress,
  userLessonWatchState,
} from "@/server/db";
import { requireMemberPage } from "@/server/member-session";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; sectionSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, sectionSlug, lessonSlug } = await params;
  const session = await requireMemberPage();
  const db = getDb();

  const shell = await db
    .select({
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      sectionId: sections.id,
      sectionTitle: sections.title,
      courseId: courses.id,
      courseTitle: courses.title,
      requiredTier: courses.requiredTier,
      isFree: courses.isFree,
    })
    .from(lessons)
    .innerJoin(sections, eq(lessons.sectionId, sections.id))
    .innerJoin(courses, eq(sections.courseId, courses.id))
    .where(
      and(
        eq(courses.slug, courseSlug),
        eq(courses.status, "active"),
        eq(sections.slug, sectionSlug),
        eq(lessons.slug, lessonSlug),
      ),
    )
    .then((rows) => rows[0] ?? null);
  if (!shell) notFound();

  const membership = normalizeTier(session.user.membership);
  if (!canAccessCourse(shell, membership)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href={`/courses/${courseSlug}`} className="text-sm text-default-500 hover:text-foreground">
          {shell.courseTitle}
        </Link>
        <div className="rounded-lg border border-warning-200 bg-warning-50 p-6">
          <p className="text-sm font-medium text-warning-700">Lesson locked</p>
          <h1 className="mt-2 text-2xl font-semibold text-warning-900">{shell.lessonTitle}</h1>
          <p className="mt-3 text-warning-800">
            This content requires {shell.requiredTier} membership. Video, lesson content, transcript, attachments, and exercises were not loaded.
          </p>
        </div>
      </div>
    );
  }

  const [lesson, transcripts, attachments, chapters, progress, watchState, structure] = await Promise.all([
    db.select().from(lessons).where(eq(lessons.id, shell.lessonId)).then((rows) => rows[0]),
    db.select().from(lessonTranscripts).where(eq(lessonTranscripts.lessonId, shell.lessonId)).orderBy(asc(lessonTranscripts.language)),
    db.select().from(lessonAttachments).where(eq(lessonAttachments.lessonId, shell.lessonId)).orderBy(asc(lessonAttachments.sortOrder)),
    db.select().from(lessonChapters).where(eq(lessonChapters.lessonId, shell.lessonId)).orderBy(asc(lessonChapters.sortOrder)),
    db.select().from(userLessonProgress).where(and(eq(userLessonProgress.userId, session.user.id), eq(userLessonProgress.lessonId, shell.lessonId))).then((rows) => rows[0] ?? null),
    db.select().from(userLessonWatchState).where(and(eq(userLessonWatchState.userId, session.user.id), eq(userLessonWatchState.lessonId, shell.lessonId))).then((rows) => rows[0] ?? null),
    getCourseStructure(shell.courseId),
  ]);
  if (!lesson) notFound();

  const orderedLessons = structure.sections.flatMap((section) =>
    structure.lessons
      .filter((item) => item.sectionId === section.id)
      .map((item) => ({ ...item, sectionSlug: section.slug })),
  );
  const currentIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
  const previous = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < orderedLessons.length - 1
    ? orderedLessons[currentIndex + 1]
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="space-y-3">
        <Link href={`/courses/${courseSlug}`} className="text-sm text-default-500 hover:text-foreground">
          {shell.courseTitle} / {shell.sectionTitle}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{lesson.title}</h1>
            {lesson.summary ? <p className="mt-2 max-w-3xl text-default-500">{lesson.summary}</p> : null}
          </div>
          <LessonActions courseSlug={courseSlug} lessonId={lesson.id} initialCompleted={Boolean(progress?.completed)} />
        </div>
      </header>

      {lesson.videoUrl ? (
        <LessonVideo lessonId={lesson.id} videoUrl={lesson.videoUrl} initialPosition={watchState?.lastPositionSeconds ?? 0} />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-lg bg-default-100 text-default-500">
          No video for this lesson.
        </div>
      )}

      {lesson.content ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Lesson</h2>
          <div className="whitespace-pre-wrap leading-7 text-default-700">{lesson.content}</div>
        </section>
      ) : null}

      {chapters.length > 0 ? (
        <section className="space-y-3 border-t border-divider pt-6">
          <h2 className="text-xl font-semibold">Chapters</h2>
          <ol className="divide-y divide-divider rounded-lg border border-divider">
            {chapters.map((chapter) => (
              <li key={chapter.id} className="flex justify-between gap-4 px-4 py-3">
                <span>{chapter.title}</span>
                <span className="text-sm tabular-nums text-default-500">{Math.floor(chapter.startSeconds / 60)}:{String(chapter.startSeconds % 60).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {lesson.exerciseData ? <ExercisePanel lessonId={lesson.id} exerciseData={lesson.exerciseData} /> : null}

      {transcripts.length > 0 ? (
        <section className="space-y-3 border-t border-divider pt-6">
          <h2 className="text-xl font-semibold">Transcript</h2>
          {transcripts.map((transcript) => (
            <details key={transcript.id} className="rounded-lg border border-divider p-4">
              <summary className="cursor-pointer font-medium">{transcript.language}</summary>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-default-600">{transcript.content}</p>
            </details>
          ))}
        </section>
      ) : null}

      {attachments.length > 0 ? (
        <section className="space-y-3 border-t border-divider pt-6">
          <h2 className="text-xl font-semibold">Attachments</h2>
          <div className="divide-y divide-divider rounded-lg border border-divider">
            {attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/lessons/${lesson.id}/attachments/${attachment.id}/download`}
                className="flex min-h-12 items-center justify-between px-4 py-3 hover:bg-default-50"
              >
                <span>{attachment.title}</span>
                <span className="text-xs uppercase text-default-500">{attachment.type}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="flex items-center justify-between gap-4 border-t border-divider pt-6">
        {previous ? (
          <Link href={`/courses/${courseSlug}/${previous.sectionSlug}/${previous.slug}`} className="font-medium hover:underline">
            Previous
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/courses/${courseSlug}/${next.sectionSlug}/${next.slug}`} className="font-medium hover:underline">
            Next
          </Link>
        ) : <Link href={`/courses/${courseSlug}`} className="font-medium hover:underline">Course overview</Link>}
      </nav>
    </div>
  );
}
