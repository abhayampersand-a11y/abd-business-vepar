CREATE TYPE "public"."adjust_type" AS ENUM('add', 'reduce');--> statement-breakpoint
CREATE TYPE "public"."balance_type" AS ENUM('to_receive', 'to_pay');--> statement-breakpoint
CREATE TYPE "public"."expense_type" AS ENUM('direct', 'indirect');--> statement-breakpoint
CREATE TYPE "public"."item_type" AS ENUM('product', 'service');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('customer', 'supplier', 'both');--> statement-breakpoint
CREATE TYPE "public"."txn_status" AS ENUM('unpaid', 'partial', 'paid', 'overdue', 'cancelled', 'open', 'converted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."txn_type" AS ENUM('sale', 'purchase', 'payment_in', 'payment_out', 'credit_note', 'debit_note', 'sale_order', 'purchase_order', 'estimate', 'proforma', 'delivery_challan', 'expense', 'party_to_party_received', 'party_to_party_paid', 'journal_entry', 'sale_cancelled');--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"account_name" text NOT NULL,
	"bank_name" text,
	"account_number" text,
	"ifsc_code" text,
	"upi_id" text,
	"account_holder_name" text,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"as_of_date" date,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"print_upi_qr" boolean DEFAULT false NOT NULL,
	"print_bank_details" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"type" "adjust_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"adjustment_date" date NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "expense_type" DEFAULT 'indirect' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"gstin" text,
	"business_type" text,
	"business_category" text,
	"state" text,
	"pincode" text,
	"address" text,
	"logo_url" text,
	"signature_url" text,
	"books_begin_date" date,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" "item_type" DEFAULT 'product' NOT NULL,
	"item_code" text,
	"hsn_sac" text,
	"category_id" integer,
	"unit_id" integer,
	"description" text,
	"sale_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sale_price_tax_inclusive" boolean DEFAULT false NOT NULL,
	"purchase_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"purchase_price_tax_inclusive" boolean DEFAULT false NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"discount_type" text DEFAULT 'percent',
	"discount_value" numeric(14, 2) DEFAULT '0',
	"opening_stock" numeric(14, 3) DEFAULT '0' NOT NULL,
	"opening_stock_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"opening_stock_date" date,
	"stock_qty" numeric(14, 3) DEFAULT '0' NOT NULL,
	"min_stock_level" numeric(14, 3) DEFAULT '0',
	"location" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"lender_name" text NOT NULL,
	"account_number" text,
	"loan_type" text,
	"description" text,
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"current_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"interest_rate" numeric(6, 3) DEFAULT '0' NOT NULL,
	"term_months" integer,
	"opening_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"principal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"interest" numeric(14, 2) DEFAULT '0' NOT NULL,
	"txn_date" date NOT NULL,
	"payment_type" text DEFAULT 'Cash' NOT NULL,
	"bank_account_id" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"gstin" text,
	"gst_type" text DEFAULT 'unregistered',
	"party_type" "party_type" DEFAULT 'customer' NOT NULL,
	"billing_address" text,
	"shipping_address" text,
	"state" text,
	"party_group" text DEFAULT 'General',
	"credit_limit" numeric(14, 2),
	"opening_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"opening_balance_type" "balance_type" DEFAULT 'to_receive' NOT NULL,
	"opening_date" date,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_txn_id" integer NOT NULL,
	"invoice_txn_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"type" "adjust_type" NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"at_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"adjustment_date" date NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"txn_id" integer NOT NULL,
	"item_id" integer,
	"item_name" text NOT NULL,
	"hsn_sac" text,
	"quantity" numeric(14, 3) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'Pcs',
	"price_per_unit" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_tax_inclusive" boolean DEFAULT false NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"txn_type" "txn_type" NOT NULL,
	"txn_no" integer NOT NULL,
	"prefix" text,
	"party_id" integer,
	"party_name" text,
	"txn_date" date NOT NULL,
	"due_date" date,
	"ref_no" text,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"round_off" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"received_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"settled_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balance_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"payment_type" text DEFAULT 'Cash' NOT NULL,
	"bank_account_id" integer,
	"cheque_no" text,
	"expense_category_id" integer,
	"status" "txn_status" DEFAULT 'unpaid' NOT NULL,
	"description" text,
	"notes" text,
	"linked_txn_id" integer,
	"is_converted" boolean DEFAULT false NOT NULL,
	"transport_name" text,
	"vehicle_number" text,
	"delivery_date" date,
	"delivery_location" text,
	"eway_bill_no" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"google_id" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_adjustments" ADD CONSTRAINT "cash_adjustments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_item_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."item_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_accounts" ADD CONSTRAINT "loan_accounts_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_transactions" ADD CONSTRAINT "loan_transactions_loan_id_loan_accounts_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loan_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_transactions" ADD CONSTRAINT "loan_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_txn_id_transactions_id_fk" FOREIGN KEY ("payment_txn_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_txn_id_transactions_id_fk" FOREIGN KEY ("invoice_txn_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_txn_id_transactions_id_fk" FOREIGN KEY ("txn_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_firm_idx" ON "items" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "items_name_idx" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "parties_firm_idx" ON "parties" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "parties_name_idx" ON "parties" USING btree ("name");--> statement-breakpoint
CREATE INDEX "alloc_payment_idx" ON "payment_allocations" USING btree ("payment_txn_id");--> statement-breakpoint
CREATE INDEX "alloc_invoice_idx" ON "payment_allocations" USING btree ("invoice_txn_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_firm_key_unique" ON "settings" USING btree ("firm_id","key");--> statement-breakpoint
CREATE INDEX "txn_items_txn_idx" ON "transaction_items" USING btree ("txn_id");--> statement-breakpoint
CREATE INDEX "txn_firm_type_idx" ON "transactions" USING btree ("firm_id","txn_type");--> statement-breakpoint
CREATE INDEX "txn_party_idx" ON "transactions" USING btree ("party_id");--> statement-breakpoint
CREATE INDEX "txn_date_idx" ON "transactions" USING btree ("txn_date");--> statement-breakpoint
CREATE UNIQUE INDEX "txn_no_unique" ON "transactions" USING btree ("firm_id","txn_type","txn_no");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_key" ON "users" USING btree ("google_id");