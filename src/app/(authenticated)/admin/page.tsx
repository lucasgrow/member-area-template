import { asc, desc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { AdminConsole, type AdminConsoleData } from "@/components/admin/admin-console";
import { auth } from "@/server/auth";
import {
  billingEvents,
  courses,
  getDb,
  lessonAttachments,
  lessonChapters,
  lessons,
  lessonTranscripts,
  productAccessMappings,
  sections,
  subscriptions,
  users,
} from "@/server/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const db = getDb();
  const [courseRows, sectionRows, lessonRows, transcriptRows, attachmentRows, chapterRows, userRows, subscriptionRows, eventRows, mappingRows] = await Promise.all([
    db.select().from(courses).orderBy(asc(courses.sortOrder)),
    db.select().from(sections).orderBy(asc(sections.sortOrder)),
    db.select().from(lessons).orderBy(asc(lessons.sortOrder)),
    db.select().from(lessonTranscripts).orderBy(asc(lessonTranscripts.language)),
    db.select().from(lessonAttachments).orderBy(asc(lessonAttachments.sortOrder)),
    db.select().from(lessonChapters).orderBy(asc(lessonChapters.sortOrder)),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, membership: users.membership }).from(users).orderBy(desc(users.createdAt)).limit(100),
    db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(100),
    db.select().from(billingEvents).orderBy(desc(billingEvents.createdAt)).limit(100),
    db.select().from(productAccessMappings).orderBy(asc(productAccessMappings.source)),
  ]);

  const data: AdminConsoleData = {
    courses: courseRows.map(({ id, slug, title, status, requiredTier }) => ({ id, slug, title, status, requiredTier })),
    sections: sectionRows.map(({ id, courseId, slug, title }) => ({ id, courseId, slug, title })),
    lessons: lessonRows.map(({ id, sectionId, slug, title }) => ({ id, sectionId, slug, title })),
    transcripts: transcriptRows.map(({ id, lessonId, language }) => ({ id, lessonId, language })),
    attachments: attachmentRows.map(({ id, lessonId, title, type }) => ({ id, lessonId, title, type })),
    chapters: chapterRows.map(({ id, lessonId, title, startSeconds }) => ({ id, lessonId, title, startSeconds })),
    users: userRows,
    subscriptions: subscriptionRows.map(({ id, userId, plan, status, source, expiresAt }) => ({
      id,
      userId,
      plan,
      status,
      source,
      expiresAt: expiresAt?.toISOString() ?? null,
    })),
    events: eventRows.map(({ id, source, eventType, projectionStatus, lastError, createdAt }) => ({
      id,
      source,
      eventType,
      projectionStatus,
      lastError,
      createdAt: createdAt.toISOString(),
    })),
    mappings: mappingRows.map(({ id, source, externalProductId, plan, requiresOnboarding, label }) => ({
      id,
      source,
      externalProductId,
      plan,
      requiresOnboarding,
      label,
    })),
  };

  return <AdminConsole data={data} />;
}
