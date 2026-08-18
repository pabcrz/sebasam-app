import { describe, expect, it, vi } from "vitest";
import {
  buildProfileRecoveryPlan,
  recoverUserProfiles,
} from "../../../scripts/recover-user-profiles";

const authIdentities = [
  { id: "pablo-id", email: "pablo@sebasam.local", username: "pablo" },
  { id: "fede-id", email: "fede@sebasam.local", username: null },
  { id: "andres-id", email: "andres@sebasam.local", username: "andres" },
  { id: "sebas-id", email: "sebas@sebasam.local", username: "sebas" },
];

describe("user profile recovery", () => {
  it("builds a plan only for the three recovery accounts", () => {
    const plan = buildProfileRecoveryPlan(authIdentities);

    expect(plan.map(({ username, role }) => ({ username, role }))).toEqual([
      { username: "pablo", role: "SUPER_ADMIN" },
      { username: "fede", role: "ADMIN" },
      { username: "andres", role: "ADMIN_ASSISTANT" },
    ]);
    expect(plan.some(({ username }) => username === "sebas")).toBe(false);
    expect(plan[1].authIdentity?.id).toBe("fede-id");
  });

  it("upserts only matched public profiles and never creates a Sebas profile", async () => {
    const $queryRaw = vi.fn().mockResolvedValue(authIdentities);
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = {
      $queryRaw,
      userProfile: { upsert },
    } as unknown as Parameters<typeof recoverUserProfiles>[0];

    await expect(recoverUserProfiles(prisma)).resolves.toEqual([
      { username: "pablo", role: "SUPER_ADMIN", status: "upserted" },
      { username: "fede", role: "ADMIN", status: "upserted" },
      { username: "andres", role: "ADMIN_ASSISTANT", status: "upserted" },
    ]);

    expect($queryRaw).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(3);
    expect(upsert.mock.calls.map(([args]) => args.where.id)).toEqual([
      "pablo-id",
      "fede-id",
      "andres-id",
    ]);
    expect(upsert.mock.calls.some(([args]) => args.create.username === "sebas")).toBe(false);
  });
});
