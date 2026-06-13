CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_name` text NOT NULL,
	`subcategory` text NOT NULL,
	`count` integer NOT NULL,
	`window_minutes` integer NOT NULL,
	`threshold` integer NOT NULL,
	`fired_at` integer NOT NULL,
	`acknowledged_at` integer,
	`sample_post_ids` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classifications` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`sentiment` text NOT NULL,
	`subcategory` text NOT NULL,
	`confidence` real NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`classified_at` integer NOT NULL,
	`model_used` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `classifications_post_id_unique` ON `classifications` (`post_id`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author_handle` text,
	`content_text` text NOT NULL,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`source_url` text,
	`author_handle` text,
	`content_text` text NOT NULL,
	`raw_json` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`keyword` text NOT NULL
);
