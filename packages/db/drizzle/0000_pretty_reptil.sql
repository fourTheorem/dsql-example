CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"listId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL
);
--> statement-breakpoint
-- CREATE INDEX "list_id_idx" ON "items" USING btree ("listId");
CREATE INDEX ASYNC list_id_idx ON items ("listId");
