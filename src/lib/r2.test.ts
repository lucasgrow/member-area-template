import { describe, expect, test } from "bun:test";

import { assertAllowedR2Prefix, sanitizeR2Filename } from "./r2";

describe("R2 helpers", () => {
  test("sanitizes path traversal and header-sensitive characters", () => {
    expect(sanitizeR2Filename("../../lesson:one?.pdf")).toBe("____lesson_one_.pdf");
    expect(sanitizeR2Filename("   ")).toBe("file");
    expect(sanitizeR2Filename("lesson\nnotes.pdf")).toBe("lesson_notes.pdf");
  });

  test("accepts only kernel upload prefixes", () => {
    expect(() => assertAllowedR2Prefix("attachments")).not.toThrow();
    expect(() => assertAllowedR2Prefix("community")).toThrow("Invalid upload prefix");
  });
});
