CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`portfolioId` int,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`fileUrl` varchar(600) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`fileSize` int NOT NULL,
	`category` enum('resume','project_image','profile_image','certificate','other') NOT NULL DEFAULT 'other',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` varchar(80) NOT NULL DEFAULT 'minimal',
	`slug` varchar(80) NOT NULL,
	`fullName` varchar(160),
	`professionalTitle` varchar(160),
	`bio` text,
	`location` varchar(160),
	`profileImageFileId` int,
	`resumeFileId` int,
	`skills` text,
	`socialLinks` text,
	`published` boolean NOT NULL DEFAULT false,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolios_id` PRIMARY KEY(`id`),
	CONSTRAINT `portfolios_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `portfolios_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portfolioId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`imageFileId` int,
	`liveUrl` varchar(500),
	`githubUrl` varchar(500),
	`technologies` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerUserId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`referralCode` varchar(32) NOT NULL,
	`status` enum('pending','qualified','approved','paid','rejected') NOT NULL DEFAULT 'pending',
	`qualifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `referrals_referred_user_idx` UNIQUE(`referredUserId`)
);
--> statement-breakpoint
CREATE TABLE `rewardAuditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rewardId` int NOT NULL,
	`adminUserId` int NOT NULL,
	`fromStatus` varchar(32) NOT NULL,
	`toStatus` varchar(32) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rewardAuditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referralId` int NOT NULL,
	`userId` int NOT NULL,
	`amountKobo` int NOT NULL DEFAULT 10000,
	`status` enum('pending','approved','paid','rejected') NOT NULL DEFAULT 'pending',
	`approvedAt` timestamp,
	`paidAt` timestamp,
	`rejectedAt` timestamp,
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rewards_id` PRIMARY KEY(`id`),
	CONSTRAINT `rewards_referralId_unique` UNIQUE(`referralId`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`previewImageUrl` varchar(500),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_slug_idx` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(32) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `referredByUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `suspended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_referral_code_idx` UNIQUE(`referralCode`);--> statement-breakpoint
CREATE INDEX `files_user_idx` ON `files` (`userId`);--> statement-breakpoint
CREATE INDEX `projects_portfolio_idx` ON `projects` (`portfolioId`);--> statement-breakpoint
CREATE INDEX `referrals_referrer_idx` ON `referrals` (`referrerUserId`);--> statement-breakpoint
CREATE INDEX `referrals_status_idx` ON `referrals` (`status`);--> statement-breakpoint
CREATE INDEX `reward_audit_reward_idx` ON `rewardAuditLogs` (`rewardId`);--> statement-breakpoint
CREATE INDEX `rewards_status_idx` ON `rewards` (`status`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);