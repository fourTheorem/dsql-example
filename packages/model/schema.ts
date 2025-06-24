import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const lists = pgTable("lists", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
});

export const items = pgTable(
  "items",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 255 }).notNull(),
    listId: uuid().notNull(),
  },
  (_table) => [
    // For now, we don't create DSQL ASYNC INDEXES as it would require
    // a bit of customisation here...and we don't know how yet 🙂
    // index("list_id_idx").on(table.listId)
  ],
);

export const listRelations = relations(lists, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(lists, {
    fields: [items.listId],
    references: [lists.id],
  }),
}));
