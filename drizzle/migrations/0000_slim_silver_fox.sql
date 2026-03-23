CREATE TABLE `short_urls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`short_code` text NOT NULL,
	`original_url` text NOT NULL,
	`normalized_url` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `short_urls_short_code_unique` ON `short_urls` (`short_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `short_urls_normalized_url_unique` ON `short_urls` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `idx_short_urls_short_code` ON `short_urls` (`short_code`);