import { z } from "zod/v4";

const nameSchema = z
  .string()
  .min(1)
  .max(1024)
  .regex(/^[\p{L}\p{N}\p{P}\p{Zs}\p{Emoji}]{1,255}$/u);

export const CreateListSchema = z.object({
  name: nameSchema,
});

export const ListSchema = CreateListSchema.extend({
  id: z.uuidv4(),
});

export const CreateItemSchema = z.object({
  name: nameSchema,
});

export const ItemSchema = CreateItemSchema.extend({
  id: z.uuidv4(),
  listId: z.uuidv4(),
});
