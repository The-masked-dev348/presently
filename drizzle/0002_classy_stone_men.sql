CREATE TABLE `projectMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`fileId` int NOT NULL,
	`mediaType` enum('image','video') NOT NULL,
	`caption` varchar(240),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `files` MODIFY COLUMN `category` enum('resume','project_image','project_media','profile_image','certificate','other') NOT NULL DEFAULT 'other';--> statement-breakpoint
CREATE INDEX `project_media_project_idx` ON `projectMedia` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_media_user_idx` ON `projectMedia` (`userId`);