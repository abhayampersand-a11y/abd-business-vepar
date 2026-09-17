-- Every item gets a unique code before the index goes on (same steps as `node scripts/db.mjs item-codes`).
UPDATE "items" SET "item_code" = NULL WHERE btrim("item_code") = '';--> statement-breakpoint
UPDATE "items" SET "item_code" = btrim("item_code") WHERE "item_code" <> btrim("item_code");--> statement-breakpoint
UPDATE "items" i SET "item_code" = i."item_code" || '-' || i."id" FROM (SELECT "id", row_number() OVER (PARTITION BY "firm_id", lower("item_code") ORDER BY "id") AS rn FROM "items" WHERE "item_code" IS NOT NULL) d WHERE d."id" = i."id" AND d.rn > 1;--> statement-breakpoint
UPDATE "items" SET "item_code" = 'ITM' || lpad("id"::text, greatest(5, length("id"::text)), '0') WHERE "item_code" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "items_firm_code_key" ON "items" USING btree ("firm_id",lower(item_code));
