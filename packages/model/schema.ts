import { pgTable, varchar, uuid } from "drizzle-orm/pg-core";

export const lists = pgTable("lists", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
});

export const items = pgTable("items", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  listId: uuid().notNull().references(() => lists.id),
});
