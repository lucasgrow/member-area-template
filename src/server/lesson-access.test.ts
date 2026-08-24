import { describe, expect, test } from "bun:test";

import { resolveLessonAccess, type LessonAccessRow } from "./lesson-access";

const proLesson: LessonAccessRow = {
  lessonId: "les_one",
  lessonSlug: "lesson-one",
  lessonTitle: "Lesson one",
  sectionId: "sec_one",
  sectionSlug: "module-one",
  sectionTitle: "Module one",
  courseId: "crs_one",
  courseSlug: "pro-course",
  courseTitle: "Pro course",
  courseRequiredTier: "pro",
  courseIsFree: false,
};

describe("lesson access", () => {
  test("rejects a free member before progress or asset handlers continue", () => {
    expect(resolveLessonAccess(proLesson, "free")).toBeNull();
  });

  test("returns only safe routing metadata to an authorized member", () => {
    const access = resolveLessonAccess(proLesson, "pro");
    expect(access?.lesson).toEqual({
      id: "les_one",
      slug: "lesson-one",
      title: "Lesson one",
    });
    expect(access?.course.requiredTier).toBe("pro");
    expect(access?.lesson).not.toHaveProperty("content");
    expect(access?.lesson).not.toHaveProperty("videoUrl");
  });
});
