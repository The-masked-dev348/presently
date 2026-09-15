import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  files,
  portfolios,
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

export async function getFilesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
}

export async function getPortfolioBundleByUserId(userId: number) {
  const portfolio = await getPortfolioByUserId(userId);
  if (!portfolio) return null;
  const [projectRows, fileRows] = await Promise.all([
    getProjectsByPortfolioId(portfolio.id),
    getFilesByUserId(userId),
  ]);
  return { portfolio, projects: projectRows, files: fileRows };
}

export async function getPublicPortfolioBundle(slug: string) {
  const portfolio = await getPortfolioBySlug(slug);
  if (!portfolio) return null;
  const [owner, projectRows] = await Promise.all([
    getUserById(portfolio.userId),
    getProjectsByPortfolioId(portfolio.id),
  ]);
  if (!owner || owner.suspended) return null;
  return { portfolio, projects: projectRows, owner };
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
