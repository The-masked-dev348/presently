import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    referralCode: varchar("referralCode", { length: 32 }).default("pending").notNull(),
    referredByUserId: int("referredByUserId"),
    emailVerified: boolean("emailVerified").default(false).notNull(),
    suspended: boolean("suspended").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  (table) => ({
    referralCodeIdx: uniqueIndex("users_referral_code_idx").on(table.referralCode),
    emailIdx: index("users_email_idx").on(table.email),
  }),
);

export const templates = mysqlTable(
  "templates",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 80 }).notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    previewImageUrl: varchar("previewImageUrl", { length: 500 }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ slugIdx: uniqueIndex("templates_slug_idx").on(table.slug) }),
);

export const portfolios = mysqlTable(
  "portfolios",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique(),
    templateId: varchar("templateId", { length: 80 }).default("minimal").notNull(),
    slug: varchar("slug", { length: 80 }).notNull(),
    fullName: varchar("fullName", { length: 160 }),
    professionalTitle: varchar("professionalTitle", { length: 160 }),
    bio: text("bio"),
    location: varchar("location", { length: 160 }),
    profileImageFileId: int("profileImageFileId"),
    resumeFileId: int("resumeFileId"),
    skills: text("skills"),
    socialLinks: text("socialLinks"),
    published: boolean("published").default(false).notNull(),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ slugIdx: uniqueIndex("portfolios_slug_idx").on(table.slug) }),
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    portfolioId: int("portfolioId").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    clientProblem: text("clientProblem"),
    solution: text("solution"),
    businessImpact: text("businessImpact"),
    imageFileId: int("imageFileId"),
    liveUrl: varchar("liveUrl", { length: 500 }),
    githubUrl: varchar("githubUrl", { length: 500 }),
    technologies: text("technologies"),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ portfolioIdx: index("projects_portfolio_idx").on(table.portfolioId) }),
);

export const projectMedia = mysqlTable(
  "projectMedia",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull(),
    userId: int("userId").notNull(),
    fileId: int("fileId").notNull(),
    mediaType: mysqlEnum("mediaType", ["image", "video"]).notNull(),
    caption: varchar("caption", { length: 240 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_media_project_idx").on(table.projectId),
    userIdx: index("project_media_user_idx").on(table.userId),
  }),
);

export const files = mysqlTable(
  "files",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    portfolioId: int("portfolioId"),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 600 }).notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    fileSize: int("fileSize").notNull(),
    category: mysqlEnum("category", ["resume", "project_image", "project_media", "profile_image", "certificate", "other"]).default("other").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ userIdx: index("files_user_idx").on(table.userId) }),
);

export const inquiries = mysqlTable(
  "inquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    portfolioId: int("portfolioId").notNull(),
    freelancerUserId: int("freelancerUserId").notNull(),
    senderName: varchar("senderName", { length: 160 }).notNull(),
    senderEmail: varchar("senderEmail", { length: 320 }).notNull(),
    senderWhatsapp: varchar("senderWhatsapp", { length: 40 }),
    service: varchar("service", { length: 180 }),
    budget: varchar("budget", { length: 80 }),
    timeline: varchar("timeline", { length: 80 }),
    message: text("message").notNull(),
    source: varchar("source", { length: 120 }),
    status: mysqlEnum("status", ["new", "contacted", "won", "archived"]).default("new").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ freelancerIdx: index("inquiries_freelancer_idx").on(table.freelancerUserId), statusIdx: index("inquiries_status_idx").on(table.status) }),
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    inquiryId: int("inquiryId"),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ userIdx: index("notifications_user_idx").on(table.userId), unreadIdx: index("notifications_unread_idx").on(table.userId, table.readAt) }),
);

export const referrals = mysqlTable(
  "referrals",
  {
    id: int("id").autoincrement().primaryKey(),
    referrerUserId: int("referrerUserId").notNull(),
    referredUserId: int("referredUserId").notNull(),
    referralCode: varchar("referralCode", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["pending", "qualified", "approved", "paid", "rejected"]).default("pending").notNull(),
    qualifiedAt: timestamp("qualifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    referredUserIdx: uniqueIndex("referrals_referred_user_idx").on(table.referredUserId),
    referrerIdx: index("referrals_referrer_idx").on(table.referrerUserId),
    statusIdx: index("referrals_status_idx").on(table.status),
  }),
);

export const rewards = mysqlTable(
  "rewards",
  {
    id: int("id").autoincrement().primaryKey(),
    referralId: int("referralId").notNull().unique(),
    userId: int("userId").notNull(),
    amountKobo: int("amountKobo").notNull().default(10000),
    status: mysqlEnum("status", ["pending", "approved", "paid", "rejected"]).default("pending").notNull(),
    approvedAt: timestamp("approvedAt"),
    paidAt: timestamp("paidAt"),
    rejectedAt: timestamp("rejectedAt"),
    adminNote: text("adminNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ statusIdx: index("rewards_status_idx").on(table.status) }),
);

export const rewardAuditLogs = mysqlTable(
  "rewardAuditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    rewardId: int("rewardId").notNull(),
    adminUserId: int("adminUserId").notNull(),
    fromStatus: varchar("fromStatus", { length: 32 }).notNull(),
    toStatus: varchar("toStatus", { length: 32 }).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ rewardIdx: index("reward_audit_reward_idx").on(table.rewardId) }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Portfolio = typeof portfolios.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type PresentlyFile = typeof files.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
