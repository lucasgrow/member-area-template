export type MembershipTier = "free" | "start" | "pro" | "ultra";

type CourseAccessRow = {
  isFree?: boolean | null;
  requiredTier?: string | null;
};

const TIER_LEVEL: Record<MembershipTier, number> = {
  free: 0,
  start: 1,
  pro: 2,
  ultra: 3,
};

function isMembershipTier(tier: string): tier is MembershipTier {
  return tier === "free" || tier === "start" || tier === "pro" || tier === "ultra";
}

export function tierLevel(tier: string | null | undefined): number {
  if (!tier) return TIER_LEVEL.free;
  return TIER_LEVEL[tier as MembershipTier] ?? TIER_LEVEL.free;
}

export function normalizeTier(tier: string | null | undefined): MembershipTier {
  if (tier === "start" || tier === "pro" || tier === "ultra") return tier;
  return "free";
}

export function meetsTier(
  membership: string | null | undefined,
  requiredTier: string | null | undefined,
): boolean {
  const required = requiredTier ?? "free";
  if (!isMembershipTier(required)) return false;
  return tierLevel(membership) >= tierLevel(required);
}

export function canAccessCourse(
  course: CourseAccessRow,
  membership: string | null | undefined,
): boolean {
  const requiredTier = course.requiredTier ?? (course.isFree ? "free" : "pro");
  return meetsTier(membership, requiredTier);
}
