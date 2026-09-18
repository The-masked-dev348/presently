import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
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
  rewards,
  templates,
  users,
} from "../drizzle/schema";
import { makeReferralCode } from "../shared/presently";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const referralCode = user.referralCode ?? makeReferralCode(user.name ?? "presently");
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    referralCode,
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Record<string, unknown> = {
    name: values.name,
    email: values.email,
    loginMethod: values.loginMethod,
    lastSignedIn: values.lastSignedIn,
  };
  if (user.role || user.openId === ENV.ownerOpenId) updateSet.role = values.role;

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getPortfolioByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1);
  return result[0];
}

export async function getPortfolioBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(portfolios).where(and(eq(portfolios.slug, slug), eq(portfolios.published, true))).limit(1);
  return result[0];
}

export async function getProjectsByPortfolioId(portfolioId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.portfolioId, portfolioId)).orderBy(asc(projects.sortOrder), desc(projects.createdAt));
}

type ProjectMediaBundleItem = {
  id: number;
  projectId: number;
  mediaType: "image" | "video";
  caption: string | null;
  sortOrder: number;
  url: string;
  mimeType: string;
  originalName: string;
};

type ProjectMetricBundleItem = typeof projectMetrics.$inferSelect;
type ProjectTestimonialBundleItem = typeof projectTestimonials.$inferSelect;
type ProjectEvidenceBundleItem = {
  id: number;
  projectId: number;
  evidenceType: "link" | "uploaded_file" | "image" | "artifact";
  fileId: number | null;
  externalUrl: string | null;
  caption: string | null;
  sortOrder: number;
  url: string | null;
  mimeType: string | null;
  originalName: string | null;
};

async function attachProjectMedia(projectRows: Awaited<ReturnType<typeof getProjectsByPortfolioId>>, userId: number) {
  if (!projectRows.length) return projectRows.map(project => ({ ...project, media: [] as ProjectMediaBundleItem[], metrics: [] as ProjectMetricBundleItem[], testimonials: [] as ProjectTestimonialBundleItem[], evidence: [] as ProjectEvidenceBundleItem[] }));
  const db = await getDb();
  if (!db) return projectRows.map(project => ({ ...project, media: [] as ProjectMediaBundleItem[], metrics: [] as ProjectMetricBundleItem[], testimonials: [] as ProjectTestimonialBundleItem[], evidence: [] as ProjectEvidenceBundleItem[] }));
  const projectIds = projectRows.map(project => project.id);
  const mediaRows = await db
    .select({
      id: projectMedia.id,
      projectId: projectMedia.projectId,
      mediaType: projectMedia.mediaType,
      caption: projectMedia.caption,
      sortOrder: projectMedia.sortOrder,
      url: files.fileUrl,
      mimeType: files.mimeType,
      originalName: files.originalName,
    })
    .from(projectMedia)
    .innerJoin(files, eq(projectMedia.fileId, files.id))
    .where(and(inArray(projectMedia.projectId, projectIds), eq(projectMedia.userId, userId)))
    .orderBy(asc(projectMedia.sortOrder), asc(projectMedia.createdAt));
  const [metricRows, testimonialRows, evidenceRows] = await Promise.all([
    db.select().from(projectMetrics).where(inArray(projectMetrics.projectId, projectIds)).orderBy(asc(projectMetrics.sortOrder), asc(projectMetrics.createdAt)),
    db.select().from(projectTestimonials).where(and(inArray(projectTestimonials.projectId, projectIds), eq(projectTestimonials.visibility, "public"))).orderBy(asc(projectTestimonials.sortOrder), asc(projectTestimonials.createdAt)),
    db.select().from(projectEvidence).where(inArray(projectEvidence.projectId, projectIds)).orderBy(asc(projectEvidence.sortOrder), asc(projectEvidence.createdAt)),
  ]);
  const evidenceFileIds = evidenceRows.map(item => item.fileId).filter((id): id is number => id !== null);
  const evidenceFiles = evidenceFileIds.length
    ? await db.select().from(files).where(and(inArray(files.id, evidenceFileIds), eq(files.userId, userId)))
    : [];
  const evidenceFileById = new Map(evidenceFiles.map(file => [file.id, file]));
  const byProject = new Map<number, ProjectMediaBundleItem[]>();
  for (const media of mediaRows) {
    const current = byProject.get(media.projectId) ?? [];
    current.push(media);
    byProject.set(media.projectId, current);
  }
  const metricsByProject = new Map<number, ProjectMetricBundleItem[]>();
  for (const metric of metricRows) metricsByProject.set(metric.projectId, [...(metricsByProject.get(metric.projectId) ?? []), metric]);
  const testimonialsByProject = new Map<number, ProjectTestimonialBundleItem[]>();
  for (const testimonial of testimonialRows) testimonialsByProject.set(testimonial.projectId, [...(testimonialsByProject.get(testimonial.projectId) ?? []), testimonial]);
  const evidenceByProject = new Map<number, ProjectEvidenceBundleItem[]>();
  for (const evidence of evidenceRows) {
    const file = evidence.fileId ? evidenceFileById.get(evidence.fileId) : undefined;
    const current = evidenceByProject.get(evidence.projectId) ?? [];
    current.push({ id: evidence.id, projectId: evidence.projectId, evidenceType: evidence.evidenceType, fileId: evidence.fileId, externalUrl: evidence.externalUrl, caption: evidence.caption, sortOrder: evidence.sortOrder, url: file?.fileUrl ?? null, mimeType: file?.mimeType ?? null, originalName: file?.originalName ?? null });
    evidenceByProject.set(evidence.projectId, current);
  }
  return projectRows.map(project => ({ ...project, media: byProject.get(project.id) ?? [], metrics: metricsByProject.get(project.id) ?? [], testimonials: testimonialsByProject.get(project.id) ?? [], evidence: evidenceByProject.get(project.id) ?? [] }));
}

export async function getFilesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
}

export async function getFileOwnerId(fileId: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ userId: files.userId }).from(files).where(eq(files.id, fileId)).limit(1);
  return result[0]?.userId;
}

export async function getPortfolioBundleByUserId(userId: number) {
  const portfolio = await getPortfolioByUserId(userId);
  if (!portfolio) return null;
  const [projectRows, fileRows] = await Promise.all([
    getProjectsByPortfolioId(portfolio.id),
    getFilesByUserId(userId),
  ]);
  // fileRows is already scoped to this user's own files (getFilesByUserId
  // filters on userId), so a lookup here can never resolve another user's
  // file even if profileImageFileId were ever set to a foreign id.
  const profileImageUrl = fileRows.find(file => file.id === portfolio.profileImageFileId)?.fileUrl ?? null;
  return { portfolio, projects: await attachProjectMedia(projectRows, userId), files: fileRows, profileImageUrl };
}

export async function getPublicPortfolioBundle(slug: string) {
  const portfolio = await getPortfolioBySlug(slug);
  if (!portfolio) return null;
  const [owner, projectRows] = await Promise.all([
    getUserById(portfolio.userId),
    getProjectsByPortfolioId(portfolio.id),
  ]);
  if (!owner || owner.suspended) return null;
  let profileImageUrl: string | null = null;
  if (portfolio.profileImageFileId) {
    const db = await getDb();
    if (db) {
      // Constrained to files.userId === portfolio.userId so a visitor can
      // only ever be served the image the portfolio's own owner uploaded.
      const match = await db
        .select({ fileUrl: files.fileUrl })
        .from(files)
        .where(and(eq(files.id, portfolio.profileImageFileId), eq(files.userId, portfolio.userId)))
        .limit(1);
      profileImageUrl = match[0]?.fileUrl ?? null;
    }
  }
  return { portfolio, projects: await attachProjectMedia(projectRows, portfolio.userId), owner, profileImageUrl };
}

export async function getInquiriesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inquiries).where(eq(inquiries.freelancerUserId, userId)).orderBy(desc(inquiries.createdAt));
}

export async function getNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(20);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function getActiveTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templates).where(eq(templates.active, true)).orderBy(asc(templates.id));
}

export async function getReferralForUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const outgoing = await db.select().from(referrals).where(eq(referrals.referrerUserId, userId)).orderBy(desc(referrals.createdAt));
  const rewardRows = await db.select().from(rewards).where(eq(rewards.userId, userId)).orderBy(desc(rewards.createdAt));
  return { outgoing, rewards: rewardRows };
}
