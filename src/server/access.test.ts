import { describe, expect, test } from "bun:test";

import { canAccessCourse, meetsTier, tierLevel } from "./access";

describe("tier access", () => {
  test("orders membership tiers from free to ultra", () => {
    expect(tierLevel("free")).toBe(0);
    expect(tierLevel("start")).toBe(1);
    expect(tierLevel("pro")).toBe(2);
    expect(tierLevel("ultra")).toBe(3);
    expect(tierLevel("unknown")).toBe(0);
  });

  test("allows access when membership meets the required tier", () => {
    expect(meetsTier("free", "free")).toBe(true);
    expect(meetsTier("start", "free")).toBe(true);
    expect(meetsTier("start", "pro")).toBe(false);
    expect(meetsTier("pro", "start")).toBe(true);
    expect(meetsTier("ultra", "pro")).toBe(true);
    expect(meetsTier("ultra", "unknown")).toBe(false);
  });

  test("uses requiredTier before legacy isFree", () => {
    expect(canAccessCourse({ requiredTier: "pro", isFree: true }, "start")).toBe(false);
    expect(canAccessCourse({ requiredTier: "start", isFree: false }, "start")).toBe(true);
  });

  test("falls back to isFree when requiredTier is absent", () => {
    expect(canAccessCourse({ isFree: true }, "free")).toBe(true);
    expect(canAccessCourse({ isFree: false }, "free")).toBe(false);
    expect(canAccessCourse({ isFree: false }, "pro")).toBe(true);
  });
});
