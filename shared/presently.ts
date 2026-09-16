export const TEMPLATE_OPTIONS = [
  { slug: "minimal", name: "Minimal", description: "Quiet confidence with room for the work to speak." },
  { slug: "professional", name: "Professional", description: "Clear hierarchy for a confident first impression." },
  { slug: "creative", name: "Creative", description: "A colorful canvas for makers and visual thinkers." },
  { slug: "dark-developer", name: "Dark developer", description: "A focused, high-contrast home for technical work." },
  { slug: "editorial", name: "Editorial", description: "A considered, magazine-like presentation of your story." },
] as const;

export type TemplateSlug = (typeof TEMPLATE_OPTIONS)[number]["slug"];

export const REFERRAL_COOKIE = "presently_referral";
export const REFERRAL_REWARD_KOBO = 10000;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ALLOWED_UPLOADS = ["application/pdf", "image/jpeg", "image/png"] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "portfolio";
}

export function makeReferralCode(name: string) {
  const base = slugify(name).replace(/-/g, "").slice(0, 6).toUpperCase() || "PRESENT";
  return `${base}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function isAllowedUpload(mimeType: string, size: number) {
  return (ALLOWED_UPLOADS as readonly string[]).includes(mimeType) && size <= MAX_UPLOAD_BYTES;
}

export function isMeaningfulReferralAction(published: boolean) {
  return published === true;
}

// A file reference on a portfolio (profileImageFileId / resumeFileId) is only
// safe to save when either nothing is being changed (null/undefined — see
// callers for what each means) or the file is actually owned by the user
// making the request. `ownerUserId` is whatever the files table reports for
// that id (undefined if the id doesn't exist at all).
export function isOwnedFileId(
  fileId: number | null | undefined,
  ownerUserId: number | null | undefined,
  requestingUserId: number,
): boolean {
  if (fileId === null || fileId === undefined) return true;
  return ownerUserId === requestingUserId;
}

export function parseSocialLinks(value: string | null | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, string> : {};
  } catch {
    return {};
  }
}

export function formatNairaFromKobo(amountKobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amountKobo / 100);
}
