import { integer, pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const itemsTable = pgTable("items", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
});

