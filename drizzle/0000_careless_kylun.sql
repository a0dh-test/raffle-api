CREATE TABLE `raffles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`prize_id` text NOT NULL,
	`prize_name` text NOT NULL,
	`prize_description` text NOT NULL,
	`prize_value` real NOT NULL,
	`prize_image_url` text,
	`ticket_price` real NOT NULL,
	`max_tickets` integer NOT NULL,
	`tickets_sold` integer DEFAULT 0 NOT NULL,
	`draw_date` integer NOT NULL,
	`status` text NOT NULL,
	`winner_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`winner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "raffles_tickets_sold_within_max" CHECK("raffles"."tickets_sold" <= "raffles"."max_tickets")
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`raffle_id` text NOT NULL,
	`user_id` text NOT NULL,
	`purchased_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tickets_raffle_id_idx` ON `tickets` (`raffle_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`balance` real NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "users_balance_non_negative" CHECK("users"."balance" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);