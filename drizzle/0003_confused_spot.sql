CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portfolioId` int NOT NULL,
	`freelancerUserId` int NOT NULL,
	`senderName` varchar(160) NOT NULL,
	`senderEmail` varchar(320) NOT NULL,
	`senderWhatsapp` varchar(40),
	`service` varchar(180),
	`budget` varchar(80),
	`timeline` varchar(80),
	`message` text NOT NULL,
	`source` varchar(120),
	`status` enum('new','contacted','won','archived') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inquiryId` int,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `inquiries_freelancer_idx` ON `inquiries` (`freelancerUserId`);--> statement-breakpoint
CREATE INDEX `inquiries_status_idx` ON `inquiries` (`status`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_unread_idx` ON `notifications` (`userId`,`readAt`);