import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("session cookie options", () => {
  it("uses a top-level-navigation-safe SameSite policy", () => {
    const options = getSessionCookieOptions({ protocol: "https", headers: {} } as any);
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(true);
  });

  it("does not mark local HTTP cookies as Secure", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: {} } as any);
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
  });

  it("honors the managed proxy protocol", () => {
    const options = getSessionCookieOptions({ protocol: "http", headers: { "x-forwarded-proto": "https" } } as any);
    expect(options.secure).toBe(true);
  });
});
