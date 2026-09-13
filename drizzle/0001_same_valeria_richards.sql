ALTER TABLE "transaction_items" ADD COLUMN "discount_mode" text DEFAULT 'percent' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "invoice_discount_mode" text DEFAULT 'percent' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "invoice_discount_value" numeric(14, 2) DEFAULT '0' NOT NULL;