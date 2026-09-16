import { COOKIE_NAME, FOREIGN_FILE_ERR_MSG } from "@shared/const";
import {
  ALLOWED_UPLOADS,
  MAX_UPLOAD_BYTES,
  REFERRAL_COOKIE,
  REFERRAL_REWARD_KOBO,
  TEMPLATE_OPTIONS,
  isAllowedUpload,
  isMeaningfulReferralAction,
  isOwnedFileId,
  slugify,
} from "@shared/presently";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  files,
  portfolios,
  projects,
  referrals,
  rewardAuditLogs,
  rewards,
  templates,
  users,
} from "../drizzle/schema";
import { storagePut } from "./storage";
import {
  getActiveTemplates,
  getDb,
  getFileOwnerId,
  getFilesByUserId,
  getPortfolioBundleByUserId,
  getPortfolioByUserId,
  getPublicPortfolioBundle,
  getReferralForUser,
  getUserById,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

const socialLinksSchema = z.object({
  website: z.string().max(500).optional(),
  github: z.string().max(500).optional(),
  linkedin: z.string().max(500).optional(),
  twitter: z.string().max(500).optional(),
});

const portfolioInput = z.object({
  fullName: z.string().max(160).optional(),
  professionalTitle: z.string().max(160).optional(),
  bio: z.string().max(3000).optional(),
  location: z.string().max(160).optional(),
  skills: z.array(z.string().max(40)).max(30).optional(),
  socialLinks: socialLinksSchema.optional(),
  templateId: z.string().max(80).optional(),
  profileImageFileId: z.number().int().positive().nullable().optional(),
  resumeFileId: z.number().int().positive().nullable().optional(),
});

const projectInput = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(3000).optional(),
  imageFileId: z.number().int().positive().nullable().optional(),
  liveUrl: z.string().url().max(500).or(z.literal("")).optional(),
  githubUrl: z.string().url().max(500).or(z.literal("")).optional(),
  technologies: z.array(z.string().max(40)).max(20).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available yet." });
  return db;
}

async function requireOwnedPortfolio(userId: number, portfolioId?: number) {
  const db = await requireDb();
  const row = portfolioId
    ? (await db.select().from(portfolios).where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId))).limit(1))[0]
    : await getPortfolioByUserId(userId);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Create your portfolio before managing projects." });
  return row;
}

// Rejects a profileImageFileId/resumeFileId that doesn't belong to the
// requesting user. A no-op when the field is null (clearing it) or undefined
// (left untouched) — see isOwnedFileId for why those are always safe.
async function assertOwnedFile(fileId: number | null | undefined, userId: number) {
  if (fileId === null || fileId === undefined) return;
  const ownerId = await getFileOwnerId(fileId);
  if (!isOwnedFileId(fileId, ownerId, userId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: FOREIGN_FILE_ERR_MSG });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  templates: router({
    list: publicProcedure.query(async () => {
      const dbTemplates = await getActiveTemplates();
      return dbTemplates.length ? dbTemplates : TEMPLATE_OPTIONS.map((template, index) => ({ id: index + 1, ...template, active: true }));
    }),
  }),

  portfolio: router({
    mine: protectedProcedure.query(({ ctx }) => getPortfolioBundleByUserId(ctx.user.id)),
    save: protectedProcedure.input(portfolioInput).mutation(async ({ ctx, input }) => {
      await assertOwnedFile(input.profileImageFileId, ctx.user.id);
      await assertOwnedFile(input.resumeFileId, ctx.user.id);
      const db = await requireDb();
      const existing = await getPortfolioByUserId(ctx.user.id);
      const templateId = input.templateId ?? existing?.templateId ?? "minimal";
      if (!TEMPLATE_OPTIONS.some(template => template.slug === templateId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That template is not available." });
      }
      const skills = input.skills?.filter(Boolean).join(",") ?? existing?.skills ?? "";
      const socialLinks = input.socialLinks ? JSON.stringify(input.socialLinks) : existing?.socialLinks ?? "{}";
      const fullName = input.fullName ?? existing?.fullName ?? ctx.user.name ?? "";
      if (!existing) {
        const result = await db.insert(portfolios).values({
          userId: ctx.user.id,
          templateId,
          slug: `${slugify(fullName || "portfolio")}-${Math.random().toString(36).slice(2, 7)}`,
          fullName,
          professionalTitle: input.professionalTitle ?? "",
          bio: input.bio ?? "",
          location: input.location ?? "",
          skills,
          socialLinks,
          profileImageFileId: input.profileImageFileId ?? null,
          resumeFileId: input.resumeFileId ?? null,
        });
        const portfolioId = Number((result as unknown as { insertId: number }).insertId);
        return getPortfolioBundleByUserId(ctx.user.id).then(bundle => ({ ...bundle, portfolioId }));
      }
      await db.update(portfolios).set({
        templateId,
        fullName: input.fullName ?? existing.fullName,
        professionalTitle: input.professionalTitle ?? existing.professionalTitle,
        bio: input.bio ?? existing.bio,
        location: input.location ?? existing.location,
        skills,
        socialLinks,
        profileImageFileId: input.profileImageFileId === undefined ? existing.profileImageFileId : input.profileImageFileId,
        resumeFileId: input.resumeFileId === undefined ? existing.resumeFileId : input.resumeFileId,
      }).where(and(eq(portfolios.id, existing.id), eq(portfolios.userId, ctx.user.id)));
      return getPortfolioBundleByUserId(ctx.user.id);
    }),
    publish: protectedProcedure.input(z.object({ published: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await getPortfolioByUserId(ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Save your portfolio before publishing." });
      if (input.published && (!existing.fullName || !existing.professionalTitle)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add your name and professional title before publishing." });
      }
      const publishedAt = input.published ? new Date() : null;
      await db.transaction(async tx => {
        await tx.update(portfolios).set({ published: input.published, publishedAt }).where(and(eq(portfolios.id, existing.id), eq(portfolios.userId, ctx.user.id)));
        if (input.published && isMeaningfulReferralAction(input.published)) {
          const user = await tx.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
          const referredByUserId = user[0]?.referredByUserId;
          if (referredByUserId) {
            const referral = await tx.select().from(referrals).where(and(eq(referrals.referredUserId, ctx.user.id), eq(referrals.status, "pending"))).limit(1);
            if (referral[0]) {
              await tx.update(referrals).set({ status: "qualified", qualifiedAt: new Date() }).where(eq(referrals.id, referral[0].id));
              const existingReward = await tx.select().from(rewards).where(eq(rewards.referralId, referral[0].id)).limit(1);
              if (!existingReward[0]) {
                await tx.insert(rewards).values({ referralId: referral[0].id, userId: referredByUserId, amountKobo: REFERRAL_REWARD_KOBO, status: "pending" });
              }
            }
          }
        }
      });
      return { published: input.published, slug: existing.slug };
    }),
    public: publicProcedure.input(z.object({ slug: z.string().min(1).max(80) })).query(({ input }) => getPublicPortfolioBundle(input.slug)),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const bundle = await getPortfolioBundleByUserId(ctx.user.id);
      return bundle?.projects ?? [];
    }),
    create: protectedProcedure.input(projectInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const portfolio = await requireOwnedPortfolio(ctx.user.id);
      const result = await db.insert(projects).values({
        portfolioId: portfolio.id,
        title: input.title,
        description: input.description ?? "",
        imageFileId: input.imageFileId ?? null,
        liveUrl: input.liveUrl ?? "",
        githubUrl: input.githubUrl ?? "",
        technologies: input.technologies?.filter(Boolean).join(",") ?? "",
        sortOrder: input.sortOrder ?? 0,
      });
      return { id: Number((result as unknown as { insertId: number }).insertId) };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: projectInput })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const portfolio = await requireOwnedPortfolio(ctx.user.id);
      const owned = await db.select().from(projects).where(and(eq(projects.id, input.id), eq(projects.portfolioId, portfolio.id))).limit(1);
      if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      await db.update(projects).set({
        title: input.data.title,
        description: input.data.description ?? "",
        imageFileId: input.data.imageFileId ?? null,
        liveUrl: input.data.liveUrl ?? "",
        githubUrl: input.data.githubUrl ?? "",
        technologies: input.data.technologies?.filter(Boolean).join(",") ?? "",
        sortOrder: input.data.sortOrder ?? 0,
      }).where(eq(projects.id, input.id));
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const portfolio = await requireOwnedPortfolio(ctx.user.id);
      await db.delete(projects).where(and(eq(projects.id, input.id), eq(projects.portfolioId, portfolio.id)));
      return { success: true };
    }),
  }),

  files: router({
    list: protectedProcedure.query(({ ctx }) => getFilesByUserId(ctx.user.id)),
    upload: protectedProcedure.input(z.object({
      originalName: z.string().min(1).max(255),
      mimeType: z.string().refine(type => (ALLOWED_UPLOADS as readonly string[]).includes(type), "Unsupported file type."),
      dataBase64: z.string().min(1),
      category: z.enum(["resume", "project_image", "profile_image", "certificate", "other"]).default("other"),
    })).mutation(async ({ ctx, input }) => {
      const raw = input.dataBase64.includes(",") ? input.dataBase64.split(",").pop() ?? "" : input.dataBase64;
      const buffer = Buffer.from(raw, "base64");
      if (!isAllowedUpload(input.mimeType, buffer.byteLength) || buffer.byteLength > MAX_UPLOAD_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Files must be PDF, JPG, JPEG, or PNG and no larger than 10 MB." });
      }
      const stored = await storagePut(`${ctx.user.id}/presently/${input.originalName}`, buffer, input.mimeType);
      const db = await requireDb();
      const result = await db.insert(files).values({
        userId: ctx.user.id,
        originalName: input.originalName,
        storageKey: stored.key,
        fileUrl: stored.url,
        mimeType: input.mimeType,
        fileSize: buffer.byteLength,
        category: input.category,
      });
      return { id: Number((result as unknown as { insertId: number }).insertId), ...stored, originalName: input.originalName, category: input.category };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.delete(files).where(and(eq(files.id, input.id), eq(files.userId, ctx.user.id)));
      return { success: true };
    }),
  }),

  referrals: router({
    visit: publicProcedure.input(z.object({ code: z.string().min(3).max(32) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const referrer = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, input.code.toUpperCase())).limit(1);
      if (!referrer[0]) throw new TRPCError({ code: "NOT_FOUND", message: "That referral link is no longer active." });
      const forwardedProto = ctx.req.headers["x-forwarded-proto"];
      const secure = ctx.req.protocol === "https" || (typeof forwardedProto === "string" && forwardedProto.split(",")[0]?.trim() === "https");
      ctx.res.cookie(REFERRAL_COOKIE, input.code.toUpperCase(), { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true, sameSite: "lax", secure, path: "/" });
      return { tracked: true } as const;
    }),
    claim: protectedProcedure.input(z.object({ code: z.string().min(3).max(32) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const referrer = await db.select().from(users).where(eq(users.referralCode, input.code.toUpperCase())).limit(1);
      if (!referrer[0] || referrer[0].id === ctx.user.id) return { claimed: false } as const;
      const current = await getUserById(ctx.user.id);
      if (!current || current.referredByUserId) return { claimed: false } as const;
      const existing = await db.select().from(referrals).where(eq(referrals.referredUserId, ctx.user.id)).limit(1);
      if (existing[0]) return { claimed: false } as const;
      await db.transaction(async tx => {
        await tx.update(users).set({ referredByUserId: referrer[0].id }).where(eq(users.id, ctx.user.id));
        await tx.insert(referrals).values({ referrerUserId: referrer[0].id, referredUserId: ctx.user.id, referralCode: input.code.toUpperCase(), status: "pending" });
      });
      return { claimed: true } as const;
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const data = await getReferralForUser(ctx.user.id);
      return { referralCode: ctx.user.referralCode, ...data };
    }),
  }),

  admin: router({
    overview: adminProcedure.query(async () => {
      const db = await requireDb();
      const [userRows, portfolioRows, referralRows, rewardRows] = await Promise.all([
        db.select().from(users).orderBy(desc(users.createdAt)),
        db.select().from(portfolios).orderBy(desc(portfolios.updatedAt)),
        db.select().from(referrals).orderBy(desc(referrals.createdAt)),
        db.select().from(rewards).orderBy(desc(rewards.createdAt)),
      ]);
      return { users: userRows, portfolios: portfolioRows, referrals: referralRows, rewards: rewardRows };
    }),
    updateReward: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "paid", "rejected"]), note: z.string().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select().from(rewards).where(eq(rewards.id, input.id)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Reward not found." });
      const now = new Date();
      await db.transaction(async tx => {
        await tx.update(rewards).set({ status: input.status, adminNote: input.note ?? existing[0].adminNote, approvedAt: input.status === "approved" ? now : existing[0].approvedAt, paidAt: input.status === "paid" ? now : existing[0].paidAt, rejectedAt: input.status === "rejected" ? now : existing[0].rejectedAt }).where(eq(rewards.id, input.id));
        await tx.insert(rewardAuditLogs).values({ rewardId: input.id, adminUserId: ctx.user.id, fromStatus: existing[0].status, toStatus: input.status, note: input.note ?? "" });
      });
      return { success: true } as const;
    }),
    suspendUser: adminProcedure.input(z.object({ id: z.number().int().positive(), suspended: z.boolean() })).mutation(async ({ input }) => {
      const db = await requireDb();
      await db.update(users).set({ suspended: input.suspended }).where(eq(users.id, input.id));
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
