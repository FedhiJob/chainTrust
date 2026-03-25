export const roles = ["admin", "distributor", "receiver"] as const;
export type Role = (typeof roles)[number];
