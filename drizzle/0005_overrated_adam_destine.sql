CREATE TABLE `projectEvidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`evidenceType` enum('link','uploaded_file','image','artifact') NOT NULL,
	`fileId` int,
	`externalUrl` varchar(600),
	`caption` varchar(240),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectEvidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`beforeValue` varchar(120),
	`afterValue` varchar(120),
	`unit` varchar(40),
	`displayedChange` varchar(180),
	`timeframe` varchar(120),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectTestimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`quote` text NOT NULL,
	`clientName` varchar(160),
	`clientRoleCompany` varchar(180),
	`visibility` enum('public','private') NOT NULL DEFAULT 'public',
	`attribution` enum('named','anonymous') NOT NULL DEFAULT 'named',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectTestimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `project_evidence_project_idx` ON `projectEvidence` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_evidence_file_idx` ON `projectEvidence` (`fileId`);--> statement-breakpoint
CREATE INDEX `project_metrics_project_idx` ON `projectMetrics` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_testimonials_project_idx` ON `projectTestimonials` (`projectId`);