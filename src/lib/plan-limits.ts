// Giới hạn theo gói
export const PLAN_LIMITS: Record<
  string,
  { members: number; workflows: number; storageGB: number }
> = {
  free: { members: 3, workflows: 5, storageGB: 1 },
  pro: { members: Infinity, workflows: Infinity, storageGB: 100 },
  enterprise: { members: Infinity, workflows: Infinity, storageGB: Infinity },
};

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}