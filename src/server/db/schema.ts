import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Auth and identity ───────────────────────────────────────────

export const users = sqliteTable("user", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  membership: text("membership", { enum: ["free", "start", "pro", "ultra"] })
    .notNull()
    .default("free"),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const userSettings = sqliteTable("user_settings", {
  id: text("id")
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: text("theme", { enum: ["light", "dark", "system"] }).default("system"),
  playbackSpeed: text("playback_speed").default("Normal"),
  autoplayVideos: integer("autoplay_videos", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── Billing and access ──────────────────────────────────────────

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `sub_${crypto.randomUUID()}`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan", { enum: ["start", "pro", "ultra"] }).notNull(),
    amount: integer("amount").notNull().default(0),
    startsAt: integer("starts_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    status: text("status", { enum: ["active", "expired", "canceled"] })
      .notNull()
      .default("active"),
    source: text("source").notNull().default("manual"),
    externalRef: text("external_ref"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    idxUser: index("idx_subscriptions_user").on(table.userId),
    idxStatus: index("idx_subscriptions_status").on(table.status),
    idxExpires: index("idx_subscriptions_expires").on(table.expiresAt),
    uniqueSourceExternal: uniqueIndex("idx_subscriptions_source_external").on(
      table.source,
      table.externalRef,
    ),
  }),
);

export const productAccessMappings = sqliteTable(
  "product_access_mappings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `pam_${crypto.randomUUID()}`),
    source: text("source").notNull(),
    externalProductId: text("external_product_id").notNull(),
    plan: text("plan", { enum: ["start", "pro", "ultra"] }).notNull(),
    requiresOnboarding: integer("requires_onboarding", { mode: "boolean" })
      .notNull()
      .default(false),
    label: text("label"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueSourceProduct: uniqueIndex("idx_pam_source_product").on(
      table.source,
      table.externalProductId,
    ),
  }),
);

export const billingEvents = sqliteTable(
  "billing_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `bil_${crypto.randomUUID()}`),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    source: text("source").notNull(),
    eventType: text("event_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payload: text("payload").notNull(),
    amount: integer("amount"),
    currency: text("currency").default("BRL"),
    externalTransactionRef: text("external_transaction_ref"),
    externalSubscriptionRef: text("external_subscription_ref"),
    externalProductId: text("external_product_id"),
    eventOccurredAt: integer("event_occurred_at", { mode: "timestamp" }),
    projectionStatus: text("projection_status").notNull().default("pending"),
    processedAt: integer("processed_at", { mode: "timestamp" }),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueIdempotency: uniqueIndex("idx_billing_idempotency").on(table.idempotencyKey),
    idxExternalSubscription: index("idx_billing_external_subscription").on(
      table.externalSubscriptionRef,
    ),
    idxProjectionStatus: index("idx_billing_projection_status").on(table.projectionStatus),
  }),
);

export const userOnboarding = sqliteTable(
  "user_onboarding",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `uob_${crypto.randomUUID()}`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    flowVariant: text("flow_variant").notNull().default("default"),
    responses: text("responses"),
    startedAt: integer("started_at", { mode: "timestamp" }),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueUser: uniqueIndex("idx_user_onboarding_user").on(table.userId),
    idxStatus: index("idx_user_onboarding_status").on(table.status),
  }),
);

// ── Course content ──────────────────────────────────────────────

export const courses = sqliteTable(
  "courses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `crs_${crypto.randomUUID()}`),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    status: text("status", { enum: ["active", "archived", "draft"] })
      .notNull()
      .default("active"),
    level: text("level").default("All levels"),
    isFree: integer("is_free", { mode: "boolean" }).notNull().default(false),
    requiredTier: text("required_tier", { enum: ["free", "start", "pro", "ultra"] })
      .notNull()
      .default("free"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    idxStatusSort: index("idx_courses_status_sort").on(table.status, table.sortOrder),
    idxRequiredTier: index("idx_courses_required_tier").on(table.requiredTier),
  }),
);

export const sections = sqliteTable(
  "sections",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `sec_${crypto.randomUUID()}`),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueCourseSlug: uniqueIndex("idx_sections_course_slug").on(table.courseId, table.slug),
    idxCourseSort: index("idx_sections_course_sort").on(table.courseId, table.sortOrder),
  }),
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `les_${crypto.randomUUID()}`),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    videoUrl: text("video_url"),
    durationSeconds: integer("duration_seconds").default(0),
    content: text("content"),
    summary: text("summary"),
    exerciseData: text("exercise_data"),
    thumbnailUrl: text("thumbnail_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueSectionSlug: uniqueIndex("idx_lessons_section_slug").on(table.sectionId, table.slug),
    idxSectionSort: index("idx_lessons_section_sort").on(table.sectionId, table.sortOrder),
  }),
);

export const lessonTranscripts = sqliteTable(
  "lesson_transcripts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `trs_${crypto.randomUUID()}`),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    language: text("language").notNull().default("en"),
    content: text("content").notNull(),
    vttContent: text("vtt_content"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueLessonLanguage: uniqueIndex("idx_transcripts_lesson_language").on(
      table.lessonId,
      table.language,
    ),
    idxLesson: index("idx_transcripts_lesson").on(table.lessonId),
  }),
);

export const lessonAttachments = sqliteTable(
  "lesson_attachments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `att_${crypto.randomUUID()}`),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["pdf", "image", "video", "link", "file"] }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    r2Key: text("r2_key"),
    externalUrl: text("external_url"),
    filename: text("filename"),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: text("mime_type"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    idxLessonSort: index("idx_attachments_lesson_sort").on(
      table.lessonId,
      table.sortOrder,
    ),
    chkLocation: check(
      "chk_attachments_location",
      sql`((${table.r2Key} IS NOT NULL) <> (${table.externalUrl} IS NOT NULL))`,
    ),
    chkFileSize: check(
      "chk_attachments_file_size_nonneg",
      sql`(${table.fileSizeBytes} IS NULL) OR (${table.fileSizeBytes} >= 0)`,
    ),
  }),
);

export const lessonChapters = sqliteTable(
  "lesson_chapters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `chp_${crypto.randomUUID()}`),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    startSeconds: integer("start_seconds").notNull(),
    endSeconds: integer("end_seconds").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    idxLessonSort: index("idx_chapters_lesson_sort").on(table.lessonId, table.sortOrder),
    chkSeconds: check("chk_chapters_seconds", sql`${table.endSeconds} >= ${table.startSeconds}`),
  }),
);

// ── Progress ────────────────────────────────────────────────────

export const userLessonProgress = sqliteTable(
  "user_lesson_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `ulp_${crypto.randomUUID()}`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueUserLesson: uniqueIndex("idx_progress_user_lesson").on(
      table.userId,
      table.lessonId,
    ),
    idxUser: index("idx_progress_user").on(table.userId),
  }),
);

export const userLessonWatchState = sqliteTable(
  "user_lesson_watch_state",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `wst_${crypto.randomUUID()}`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    lastPositionSeconds: integer("last_position_seconds").notNull().default(0),
    maxPositionSeconds: integer("max_position_seconds").notNull().default(0),
    maxPercentWatched: integer("max_percent_watched").notNull().default(0),
    totalWatchTimeSeconds: integer("total_watch_time_seconds").notNull().default(0),
    watchedToEnd: integer("watched_to_end", { mode: "boolean" }).notNull().default(false),
    playCount: integer("play_count").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueUserLesson: uniqueIndex("idx_watch_state_user_lesson").on(
      table.userId,
      table.lessonId,
    ),
    chkNonNegative: check(
      "chk_watch_state_nonneg",
      sql`${table.lastPositionSeconds} >= 0 AND ${table.maxPositionSeconds} >= 0 AND ${table.totalWatchTimeSeconds} >= 0 AND ${table.playCount} >= 0`,
    ),
    chkPercent: check(
      "chk_watch_state_percent",
      sql`${table.maxPercentWatched} BETWEEN 0 AND 100`,
    ),
  }),
);

export const userExerciseProgress = sqliteTable(
  "user_exercise_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `uep_${crypto.randomUUID()}`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedSteps: text("completed_steps").notNull().default("[]"),
    quizAnswers: text("quiz_answers").notNull().default("{}"),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    uniqueUserLesson: uniqueIndex("idx_exercise_progress_user_lesson").on(
      table.userId,
      table.lessonId,
    ),
  }),
);
