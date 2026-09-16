import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("inquiries.submit", () => {
  it("rejects malformed lead details before touching the database", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.inquiries.submit({
      portfolioSlug: "sample",
      senderName: "A",
      senderEmail: "not-an-email",
      message: "too short",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
