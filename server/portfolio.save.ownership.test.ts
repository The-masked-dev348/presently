import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// File 999 belongs to user 42. Anyone else attempting to attach it should be
// rejected before the mutation ever touches the database.
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getFileOwnerId: vi.fn(async (fileId: number) => (fileId === 999 ? 42 : undefined)),
  };
});

const { appRouter } = await import("./routers");

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function contextForUser(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("portfolio.save file ownership", () => {
  it("rejects a profileImageFileId that belongs to another user", async () => {
    const caller = appRouter.createCaller(contextForUser(7)); // requester is user 7, file 999 is owned by user 42

    await expect(caller.portfolio.save({ profileImageFileId: 999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a resumeFileId that belongs to another user", async () => {
    const caller = appRouter.createCaller(contextForUser(7));

    await expect(caller.portfolio.save({ resumeFileId: 999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("lets the file through the ownership check when the requester is the actual owner", async () => {
    const caller = appRouter.createCaller(contextForUser(42)); // file 999's real owner

    // The ownership check must pass. Depending on the test environment, the
    // subsequent save either reaches the real database or stops because no
    // database is configured; neither outcome should be FORBIDDEN.
    try {
      const result = await caller.portfolio.save({ profileImageFileId: 999 });
      expect(result?.portfolio?.profileImageFileId).toBe(999);
    } catch (error) {
      expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    }
  });
});
