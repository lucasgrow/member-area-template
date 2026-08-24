CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `billing_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text,
	`source` text NOT NULL,
	`event_type` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload` text NOT NULL,
	`amount` integer,
	`currency` text DEFAULT 'BRL',
	`external_transaction_ref` text,
	`external_subscription_ref` text,
	`external_product_id` text,
	`event_occurred_at` integer,
	`projection_status` text DEFAULT 'pending' NOT NULL,
	`processed_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_billing_idempotency` ON `billing_events` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_billing_external_subscription` ON `billing_events` (`external_subscription_ref`);--> statement-breakpoint
CREATE INDEX `idx_billing_projection_status` ON `billing_events` (`projection_status`);--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`thumbnail_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`level` text DEFAULT 'All levels',
	`is_free` integer DEFAULT false NOT NULL,
	`required_tier` text DEFAULT 'free' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_slug_unique` ON `courses` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_courses_status_sort` ON `courses` (`status`,`sort_order`);--> statement-breakpoint
CREATE INDEX `idx_courses_required_tier` ON `courses` (`required_tier`);--> statement-breakpoint
CREATE TABLE `lesson_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`r2_key` text,
	`external_url` text,
	`filename` text,
	`file_size_bytes` integer,
	`mime_type` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_attachments_location" CHECK((("lesson_attachments"."r2_key" IS NOT NULL) <> ("lesson_attachments"."external_url" IS NOT NULL))),
	CONSTRAINT "chk_attachments_file_size_nonneg" CHECK(("lesson_attachments"."file_size_bytes" IS NULL) OR ("lesson_attachments"."file_size_bytes" >= 0))
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_lesson_sort` ON `lesson_attachments` (`lesson_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `lesson_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`start_seconds` integer NOT NULL,
	`end_seconds` integer NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_chapters_seconds" CHECK("lesson_chapters"."end_seconds" >= "lesson_chapters"."start_seconds")
);
--> statement-breakpoint
CREATE INDEX `idx_chapters_lesson_sort` ON `lesson_chapters` (`lesson_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `lesson_transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`lesson_id` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`content` text NOT NULL,
	`vtt_content` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_transcripts_lesson_language` ON `lesson_transcripts` (`lesson_id`,`language`);--> statement-breakpoint
CREATE INDEX `idx_transcripts_lesson` ON `lesson_transcripts` (`lesson_id`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`section_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`video_url` text,
	`duration_seconds` integer DEFAULT 0,
	`content` text,
	`summary` text,
	`exercise_data` text,
	`thumbnail_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_lessons_section_slug` ON `lessons` (`section_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_lessons_section_sort` ON `lessons` (`section_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `product_access_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`external_product_id` text NOT NULL,
	`plan` text NOT NULL,
	`requires_onboarding` integer DEFAULT false NOT NULL,
	`label` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pam_source_product` ON `product_access_mappings` (`source`,`external_product_id`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sections_course_slug` ON `sections` (`course_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_sections_course_sort` ON `sections` (`course_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`starts_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_ref` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_status` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_expires` ON `subscriptions` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_subscriptions_source_external` ON `subscriptions` (`source`,`external_ref`);--> statement-breakpoint
CREATE TABLE `user_exercise_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`completed_steps` text DEFAULT '[]' NOT NULL,
	`quiz_answers` text DEFAULT '{}' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_exercise_progress_user_lesson` ON `user_exercise_progress` (`user_id`,`lesson_id`);--> statement-breakpoint
CREATE TABLE `user_lesson_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_progress_user_lesson` ON `user_lesson_progress` (`user_id`,`lesson_id`);--> statement-breakpoint
CREATE INDEX `idx_progress_user` ON `user_lesson_progress` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_lesson_watch_state` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`last_position_seconds` integer DEFAULT 0 NOT NULL,
	`max_position_seconds` integer DEFAULT 0 NOT NULL,
	`max_percent_watched` integer DEFAULT 0 NOT NULL,
	`total_watch_time_seconds` integer DEFAULT 0 NOT NULL,
	`watched_to_end` integer DEFAULT false NOT NULL,
	`play_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_watch_state_nonneg" CHECK("user_lesson_watch_state"."last_position_seconds" >= 0 AND "user_lesson_watch_state"."max_position_seconds" >= 0 AND "user_lesson_watch_state"."total_watch_time_seconds" >= 0 AND "user_lesson_watch_state"."play_count" >= 0),
	CONSTRAINT "chk_watch_state_percent" CHECK("user_lesson_watch_state"."max_percent_watched" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_watch_state_user_lesson` ON `user_lesson_watch_state` (`user_id`,`lesson_id`);--> statement-breakpoint
CREATE TABLE `user_onboarding` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`flow_variant` text DEFAULT 'default' NOT NULL,
	`responses` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_onboarding_user` ON `user_onboarding` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_onboarding_status` ON `user_onboarding` (`status`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`theme` text DEFAULT 'system',
	`playback_speed` text DEFAULT 'Normal',
	`autoplay_videos` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_userId_unique` ON `user_settings` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`membership` text DEFAULT 'free' NOT NULL,
	`onboarded` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
