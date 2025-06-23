import { pgTable, varchar, uuid, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const lists = pgTable("lists", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
});

export const items = pgTable("items", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  listId: uuid().notNull(),
}, (table) => [
  // index("list_id_idx").on(table.listId)
]);


export const listRelations = relations(lists, ({ many }) => ({
  items: many(lists)
}))

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(lists, {
    fields: [items.listId],
    references: [lists.id]
  })
}))
