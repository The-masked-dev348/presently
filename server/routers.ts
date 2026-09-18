import { COOKIE_NAME, FOREIGN_FILE_ERR_MSG } from "@shared/const";
import {
  ALLOWED_UPLOADS,
  ALLOWED_PROJECT_MEDIA,
  MAX_UPLOAD_BYTES,
  MAX_PROJECT_MEDIA_BYTES,
  REFERRAL_COOKIE,
  REFERRAL_REWARD_KOBO,
  TEMPLATE_OPTIONS,
  isAllowedUpload,
  isAllowedProjectMedia,
  isMeaningfulReferralAction,
  isOwnedFileId,
  slugify,
} from "@shared/presently";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  files,
  inquiries,
  notifications,
  portfolios,
  projectEvidence,
  projectMedia,
  projectMetrics,
  projectTestimonials,
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
  getInquiriesByUserId,
  getNotificationsByUserId,
  getUnreadNotificationCount,
  getPortfolioBundleByUserId,
  getPortfolioByUserId,
  getPortfolioBySlug,
  getPublicPortfolioBundle,
  getReferralForUser,
  getUserById,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

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
  clientProblem: z.string().max(3000).optional(),
  solution: z.string().max(3000).optional(),
  businessImpact: z.string().max(3000).optional(),
  imageFileId: z.number().int().positive().nullable().optional(),
  liveUrl: z.string().url().max(500).or(z.literal("")).optional(),
  githubUrl: z.string().url().max(500).or(z.literal("")).optional(),
  technologies: z.array(z.string().max(40)).max(20).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  metrics: z.array(z.object({
    label: z.string().trim().min(1).max(160),
    beforeValue: z.string().max(120).optional(),
    afterValue: z.string().max(120).optional(),
    unit: z.string().max(40).optional(),
    displayedChange: z.string().max(180).optional(),
    timeframe: z.string().max(120).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })).max(12).optional(),
  testimonials: z.array(z.object({
    quote: z.string().trim().min(10).max(3000),
    clientName: z.string().max(160).optional(),
    clientRoleCompany: z.string().max(180).optional(),
    visibility: z.enum(["public", "private"]).default("public"),
    attribution: z.enum(["named", "anonymous"]).default("named"),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })).max(8).optional(),
  evidence: z.array(z.object({
    evidenceType: z.enum(["link", "uploaded_file", "image", "artifact"]),
    fileId: z.number().int().positive().nullable().optional(),
    externalUrl: z.string().url().max(600).or(z.literal("")).optional(),
    caption: z.string().max(240).optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })).max(12).optional(),
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

async function requireOwnedProject(userId: number, projectId: number) {
  const db = await requireDb();
  const portfolio = await requireOwnedPortfolio(userId);
  const row = (await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.portfolioId, portfolio.id))).limit(1))[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
  return { db, portfolio, project: row };
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

async function syncProjectProof(db: Awaited<ReturnType<typeof getDb>>, projectId: number, input: z.infer<typeof projectInput>) {
  if (!db) return;
  await db.delete(projectMetrics).where(eq(projectMetrics.projectId, projectId));
  await db.delete(projectTestimonials).where(eq(projectTestimonials.projectId, projectId));
  await db.delete(projectEvidence).where(eq(projectEvidence.projectId, projectId));
  if (input.metrics?.length) {
    await db.insert(projectMetrics).values(input.metrics.map((metric, index) => ({ projectId, label: metric.label, beforeValue: metric.beforeValue ?? null, afterValue: metric.afterValue ?? null, unit: metric.unit ?? null, displayedChange: metric.displayedChange ?? null, timeframe: metric.timeframe ?? null, sortOrder: metric.sortOrder ?? index })));
  }
  if (input.testimonials?.length) {
    await db.insert(projectTestimonials).values(input.testimonials.map((testimonial, index) => ({ projectId, quote: testimonial.quote, clientName: testimonial.clientName ?? null, clientRoleCompany: testimonial.clientRoleCompany ?? null, visibility: testimonial.visibility, attribution: testimonial.attribution, sortOrder: testimonial.sortOrder ?? index })));
  }
  if (input.evidence?.length) {
    await db.insert(projectEvidence).values(input.evidence.map((item, index) => ({ projectId, evidenceType: item.evidenceType, fileId: item.fileId ?? null, externalUrl: item.externalUrl || null, caption: item.caption ?? null, sortOrder: item.sortOrder ?? index })));
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
      await assertOwnedFile(input.imageFileId, ctx.user.id);
      await Promise.all((input.evidence ?? []).map(item => assertOwnedFile(item.fileId, ctx.user.id)));
      const [insertedProject] = await db.insert(projects).values({
        portfolioId: portfolio.id,
        title: input.title,
        description: input.description ?? "",
        clientProblem: input.clientProblem ?? "",
        solution: input.solution ?? "",
        businessImpact: input.businessImpact ?? "",
        imageFileId: input.imageFileId ?? null,
        liveUrl: input.liveUrl ?? "",
        githubUrl: input.githubUrl ?? "",
        technologies: input.technologies?.filter(Boolean).join(",") ?? "",
        sortOrder: input.sortOrder ?? 0,
      }).$returningId();
      if (!insertedProject?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Project could not be identified after creation." });
      await syncProjectProof(db, insertedProject.id, input);
      return { id: insertedProject.id };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), data: projectInput })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const portfolio = await requireOwnedPortfolio(ctx.user.id);
      const owned = await db.select().from(projects).where(and(eq(projects.id, input.id), eq(projects.portfolioId, portfolio.id))).limit(1);
      if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      await assertOwnedFile(input.data.imageFileId, ctx.user.id);
      await Promise.all((input.data.evidence ?? []).map(item => assertOwnedFile(item.fileId, ctx.user.id)));
      await db.update(projects).set({
        title: input.data.title,
        description: input.data.description ?? "",
        clientProblem: input.data.clientProblem ?? "",
        solution: input.data.solution ?? "",
        businessImpact: input.data.businessImpact ?? "",
        imageFileId: input.data.imageFileId ?? null,
        liveUrl: input.data.liveUrl ?? "",
        githubUrl: input.data.githubUrl ?? "",
        technologies: input.data.technologies?.filter(Boolean).join(",") ?? "",
        sortOrder: input.data.sortOrder ?? 0,
      }).where(eq(projects.id, input.id));
      await syncProjectProof(db, input.id, input.data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const portfolio = await requireOwnedPortfolio(ctx.user.id);
      await db.delete(projects).where(and(eq(projects.id, input.id), eq(projects.portfolioId, portfolio.id)));
      return { success: true };
    }),
  }),

  projectMedia: router({
    upload: protectedProcedure.input(z.object({
      projectId: z.number().int().positive(),
      originalName: z.string().min(1).max(255),
      mimeType: z.string().refine(type => (ALLOWED_PROJECT_MEDIA as readonly string[]).includes(type), "Use JPG, PNG, WebP, MP4, WebM, or MOV files."),
      dataBase64: z.string().min(1),
      caption: z.string().max(240).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { db, portfolio } = await requireOwnedProject(ctx.user.id, input.projectId);
      const raw = input.dataBase64.includes(",") ? input.dataBase64.split(",").pop() ?? "" : input.dataBase64;
      const buffer = Buffer.from(raw, "base64");
      if (!isAllowedProjectMedia(input.mimeType, buffer.byteLength) || buffer.byteLength > MAX_PROJECT_MEDIA_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Project media must be JPG, PNG, WebP, MP4, WebM, or MOV and no larger than 50 MB." });
      }
      const stored = await storagePut(`${ctx.user.id}/presently/projects/${input.projectId}/${input.originalName}`, buffer, input.mimeType);
      const [insertedFile] = await db.insert(files).values({
        userId: ctx.user.id,
        portfolioId: portfolio.id,
        originalName: input.originalName,
        storageKey: stored.key,
        fileUrl: stored.url,
        mimeType: input.mimeType,
        fileSize: buffer.byteLength,
        category: "project_media",
      }).$returningId();
      if (!insertedFile?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Media was stored but its file record could not be identified." });
      const [insertedMedia] = await db.insert(projectMedia).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        fileId: insertedFile.id,
        mediaType: input.mimeType.startsWith("video/") ? "video" : "image",
        caption: input.caption ?? null,
        sortOrder: 0,
      }).$returningId();
      if (!insertedMedia?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Media was stored but its project link could not be identified." });
      return { id: insertedMedia.id, fileId: insertedFile.id, mediaType: input.mimeType.startsWith("video/") ? "video" as const : "image" as const, url: stored.url, originalName: input.originalName, caption: input.caption ?? null };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const row = (await db.select().from(projectMedia).where(and(eq(projectMedia.id, input.id), eq(projectMedia.userId, ctx.user.id))).limit(1))[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project media not found." });
      await db.transaction(async tx => {
        await tx.delete(projectMedia).where(eq(projectMedia.id, input.id));
        await tx.delete(files).where(and(eq(files.id, row.fileId), eq(files.userId, ctx.user.id)));
      });
      return { success: true } as const;
    }),
  }),

  projectEvidence: router({
    upload: protectedProcedure.input(z.object({
      projectId: z.number().int().positive(),
      originalName: z.string().min(1).max(255),
      mimeType: z.string().refine(type => (ALLOWED_UPLOADS as readonly string[]).includes(type), "Use PDF, JPG, JPEG, or PNG evidence files."),
      dataBase64: z.string().min(1),
      evidenceType: z.enum(["uploaded_file", "image", "artifact"]).default("uploaded_file"),
      caption: z.string().max(240).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { db, portfolio } = await requireOwnedProject(ctx.user.id, input.projectId);
      const raw = input.dataBase64.includes(",") ? input.dataBase64.split(",").pop() ?? "" : input.dataBase64;
      const buffer = Buffer.from(raw, "base64");
      if (!isAllowedUpload(input.mimeType, buffer.byteLength) || buffer.byteLength > MAX_UPLOAD_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Evidence files must be PDF, JPG, JPEG, or PNG and no larger than 10 MB." });
      }
      const stored = await storagePut(`${ctx.user.id}/presently/projects/${input.projectId}/evidence/${input.originalName}`, buffer, input.mimeType);
      const [insertedFile] = await db.insert(files).values({ userId: ctx.user.id, portfolioId: portfolio.id, originalName: input.originalName, storageKey: stored.key, fileUrl: stored.url, mimeType: input.mimeType, fileSize: buffer.byteLength, category: "other" }).$returningId();
      if (!insertedFile?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Evidence was stored but its file record could not be identified." });
      const [insertedEvidence] = await db.insert(projectEvidence).values({ projectId: input.projectId, evidenceType: input.evidenceType, fileId: insertedFile.id, caption: input.caption ?? null, sortOrder: 0 }).$returningId();
      if (!insertedEvidence?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Evidence was stored but its project link could not be identified." });
      return { id: insertedEvidence.id, fileId: insertedFile.id, evidenceType: input.evidenceType, url: stored.url, originalName: input.originalName, caption: input.caption ?? null };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const portfolio = await requireOwnedPortfolio(ctx.user.id);
      const row = (await db.select({ evidence: projectEvidence, project: projects }).from(projectEvidence).innerJoin(projects, eq(projectEvidence.projectId, projects.id)).where(and(eq(projectEvidence.id, input.id), eq(projects.portfolioId, portfolio.id))).limit(1))[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Project evidence not found." });
      await db.transaction(async tx => {
        await tx.delete(projectEvidence).where(eq(projectEvidence.id, input.id));
        if (row.evidence.fileId) await tx.delete(files).where(and(eq(files.id, row.evidence.fileId), eq(files.userId, ctx.user.id)));
      });
      return { success: true } as const;
    }),
  }),

  inquiries: router({
    submit: publicProcedure.input(z.object({
      portfolioSlug: z.string().min(1).max(80),
      senderName: z.string().trim().min(2).max(160),
      senderEmail: z.string().trim().email().max(320),
      senderWhatsapp: z.string().trim().max(40).optional(),
      service: z.string().trim().max(180).optional(),
      budget: z.string().trim().max(80).optional(),
      timeline: z.string().trim().max(80).optional(),
      message: z.string().trim().min(10).max(4000),
      website: z.string().max(200).optional(),
    })).mutation(async ({ input }) => {
      if (input.website) return { success: true } as const;
      const portfolio = await getPortfolioBySlug(input.portfolioSlug);
      if (!portfolio) throw new TRPCError({ code: "NOT_FOUND", message: "This portfolio is not accepting inquiries." });
      const db = await requireDb();
      const [insertedInquiry] = await db.transaction(async tx => {
        const [inquiry] = await tx.insert(inquiries).values({
          portfolioId: portfolio.id,
          freelancerUserId: portfolio.userId,
          senderName: input.senderName,
          senderEmail: input.senderEmail,
          senderWhatsapp: input.senderWhatsapp || null,
          service: input.service || null,
          budget: input.budget || null,
          timeline: input.timeline || null,
          message: input.message,
          source: input.portfolioSlug,
          status: "new",
        }).$returningId();
        if (!inquiry?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your inquiry could not be saved." });
        await tx.insert(notifications).values({
          userId: portfolio.userId,
          inquiryId: inquiry.id,
          title: `New inquiry from ${input.senderName}`,
          body: `${input.service || "A prospective client"} — ${input.message.slice(0, 180)}`,
        });
        return [inquiry] as const;
      });
      void notifyOwner({ title: `New Presently inquiry from ${input.senderName}`, content: `${input.senderEmail} contacted portfolio ${input.portfolioSlug}. ${input.message.slice(0, 500)}` }).catch(() => undefined);
      return { success: true, inquiryId: insertedInquiry.id } as const;
    }),
    mine: protectedProcedure.query(({ ctx }) => getInquiriesByUserId(ctx.user.id)),
    updateStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["new", "contacted", "won", "archived"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const owned = await db.select({ id: inquiries.id }).from(inquiries).where(and(eq(inquiries.id, input.id), eq(inquiries.freelancerUserId, ctx.user.id))).limit(1);
      if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Inquiry not found." });
      await db.update(inquiries).set({ status: input.status }).where(eq(inquiries.id, input.id));
      return { success: true } as const;
    }),
  }),

  notifications: router({
    mine: protectedProcedure.query(({ ctx }) => getNotificationsByUserId(ctx.user.id)),
    unreadCount: protectedProcedure.query(({ ctx }) => getUnreadNotificationCount(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user.id)));
      return { success: true } as const;
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await requireDb();
      await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, ctx.user.id), isNull(notifications.readAt)));
      return { success: true } as const;
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
      const [insertedFile] = await db.insert(files).values({
        userId: ctx.user.id,
        originalName: input.originalName,
        storageKey: stored.key,
        fileUrl: stored.url,
        mimeType: input.mimeType,
        fileSize: buffer.byteLength,
        category: input.category,
      }).$returningId();
      if (!insertedFile?.id) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Upload was stored but its file record could not be identified." });
      }
      return { id: insertedFile.id, ...stored, originalName: input.originalName, category: input.category };
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
