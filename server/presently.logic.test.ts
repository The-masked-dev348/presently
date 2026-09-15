import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { isAllowedUpload, isMeaningfulReferralAction, slugify } from "../shared/presently";
import type { TrpcContext } from "./_core/context";

const publicContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("Presently product rules", () => {
  it("only qualifies a referral after a portfolio is published", () => {
    expect(isMeaningfulReferralAction(false)).toBe(false);
    expect(isMeaningfulReferralAction(true)).toBe(true);
  });

  it("rejects uploads outside the supported types and 10 MB limit", () => {
    expect(isAllowedUpload("application/pdf", 500)).toBe(true);
    expect(isAllowedUpload("image/jpeg", 10 * 1024 * 1024)).toBe(true);
    expect(isAllowedUpload("application/zip", 500)).toBe(false);
    expect(isAllowedUpload("application/pdf", 10 * 1024 * 1024 + 1)).toBe(false);
  });

  it("creates safe readable public slugs", () => {
    expect(slugify("  Alex Morgan — Product Designer ")).toBe("alex-morgan-product-designer");
    expect(slugify("!!!")).toBe("portfolio");
  });

  it("does not expose an unpublished portfolio through the public procedure", async () => {
    const result = await appRouter.createCaller(publicContext).portfolio.public({ slug: "not-a-real-public-portfolio" });
    expect(result).toBeNull();
  });
});
