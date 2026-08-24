import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { canAccessCourse } from "../src/server/access";

const database = new Database(":memory:");
database.run("PRAGMA foreign_keys = ON");
database.exec(
  readFileSync(resolve(__dirname, "../drizzle/0000_initial_member_area.sql"), "utf-8")
    .replaceAll("--> statement-breakpoint", ""),
);

database.query(
  "INSERT INTO user (id, email, role, membership, onboarded) VALUES (?, ?, ?, ?, ?)",
).run("usr_smoke", "student@example.com", "user", "free", 1);
database.query(
  "INSERT INTO courses (id, slug, title, status, required_tier, is_free) VALUES (?, ?, ?, ?, ?, ?)",
).run("crs_smoke", "pro-course", "Pro course", "active", "pro", 0);
database.query(
  "INSERT INTO sections (id, course_id, slug, title) VALUES (?, ?, ?, ?)",
).run("sec_smoke", "crs_smoke", "module-one", "Module one");
database.query(
  "INSERT INTO lessons (id, section_id, slug, title, video_url, content) VALUES (?, ?, ?, ?, ?, ?)",
).run("les_smoke", "sec_smoke", "lesson-one", "Lesson one", "https://video.example.com/one.mp4", "Protected content");
database.query(
  "INSERT INTO lesson_attachments (id, lesson_id, type, title, r2_key, filename) VALUES (?, ?, ?, ?, ?, ?)",
).run("att_smoke", "les_smoke", "pdf", "Workbook", "attachments/workbook.pdf", "workbook.pdf");

const course = database
  .query("SELECT required_tier AS requiredTier, is_free AS isFree FROM courses WHERE id = ?")
  .get("crs_smoke") as { requiredTier: string; isFree: number };
if (canAccessCourse({ requiredTier: course.requiredTier, isFree: Boolean(course.isFree) }, "free")) {
  throw new Error("Smoke failed: free member accessed a pro course");
}
if (!canAccessCourse({ requiredTier: course.requiredTier, isFree: Boolean(course.isFree) }, "pro")) {
  throw new Error("Smoke failed: pro member could not access a pro course");
}

database.query(
  "INSERT INTO billing_events (id, source, event_type, idempotency_key, payload) VALUES (?, ?, ?, ?, ?)",
).run("bil_smoke", "generic", "purchase.approved", "generic:event-smoke", "{}");
let duplicateRejected = false;
try {
  database.query(
    "INSERT INTO billing_events (id, source, event_type, idempotency_key, payload) VALUES (?, ?, ?, ?, ?)",
  ).run("bil_duplicate", "generic", "purchase.approved", "generic:event-smoke", "{}");
} catch {
  duplicateRejected = true;
}
if (!duplicateRejected) throw new Error("Smoke failed: duplicate billing event was accepted");

const foreignKeyErrors = database.query("PRAGMA foreign_key_check").all();
if (foreignKeyErrors.length > 0) throw new Error("Smoke failed: foreign key violations found");

console.log("Kernel smoke passed: schema, content graph, tier gate, R2 attachment, and billing idempotency.");
