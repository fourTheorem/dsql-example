import fastifySwagger from '@fastify/swagger';
import { and, eq } from 'drizzle-orm';
import fastify from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod/v4';
import { getDb } from '../db/connection';
import { items, lists } from '../model/schema';
import * as apiSchema from './api-schema';

getDb();  // Initiate connection at module load time


const defaultResponseSchema = {
  400: z.object({
    error: z.string(),
  }),
  404: z.object({
    error: z.string(),
  }),
  500: z.any()
};

const responseSchema = (bodySchema: z.ZodObject | z.ZodArray | z.ZodUndefined, statusCode: number = 200) => {
  const result = {
    ...defaultResponseSchema,
    [statusCode]: bodySchema,
  };
  return result
}

export async function init() {
  const db = await getDb();
  const app = await fastify({ logger: true })
    .setValidatorCompiler(validatorCompiler)
    .setSerializerCompiler(serializerCompiler)
    .register(fastifySwagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'DSQL Example API',
          version: '0.1.0'
        },
        servers: [],
      },
      transform: jsonSchemaTransform,
    })
    .withTypeProvider<ZodTypeProvider>();

  app.get('/openapi.json', { schema: { hide: true } }, async () => {
    return app.swagger();
  });

  app.get('/', { schema: { hide: true, response: responseSchema(z.object({ hi: "there" })) } }, (_, reply) => {
    reply.send({ "hi": "there" });
  });

  app.get('/lists', {
    schema: {
      operationId: 'getLists',
      response: responseSchema(apiSchema.ListSchema.array())
    }
  }, async (_, reply) => {
    const records = await db.select().from(lists);
    reply.send(records);
  });

  app.get('/lists/:id', {
    schema: {
      operationId: 'getListById',
      params: z.object({ id: z.uuid() }),
      response: {
        ...responseSchema(apiSchema.ListSchema),
      },
    },
    links: {
      200: {
        itemsInList: {
          operationId: 'getListItems',
          parameters: {
            listId: '$response.body#/id',
          },
          description: 'The items that belong to this list'
        },
      },
    },
  }, async (request, reply) => {
    const records = await db.select().from(lists).where(eq(lists.id, request.params.id))
    if (records.length === 0) {
      return reply.code(404).send({ error: "Not Found" });
    }
    reply.send(records[0]);
  });

  app.post('/lists', {
    schema: {
      operationId: 'createList',
      body: apiSchema.CreateListSchema,
      response: responseSchema(apiSchema.ListSchema, 201),
    },
    links: {
      201: {
        getCreatedList: {
          operationId: 'getList',
          parameters: {
            id: '$response.body#/id'
          },
          description: 'Get the newly created list'
        },
        getItemsForCreatedList: {
          operationId: 'getListItems',
          parameters: {
            listId: '$response.body#/id'
          },
          description: 'Get items in the newly created list'
        }
      },
    },
  }, async (request, reply) => {
    const record = await db.insert(lists).values(request.body).returning();
    reply.code(201).send(record[0]);
  });

  app.delete('/lists/:id', {
    schema: {
      operationId: 'deleteList',
      params: z.object({ id: z.uuid() }),
      response: responseSchema(z.undefined(), 204)
    }
  }, async (request, reply) => {
    await db.delete(lists).where(eq(lists.id, request.params.id));
    reply.code(204).send();
  });

  app.put('/lists/:id', {
    schema: {
      operationId: 'putList',
      body: apiSchema.ListSchema,
      params: z.object({ id: z.uuid() }),
      response: responseSchema(z.undefined()),
    }
  }, async (request, reply) => {
    const { body, params: { id } } = request;
    const { id: _, ...updateBody } = body;
    await db.insert(lists).values({ ...updateBody, id }).onConflictDoUpdate({ target: lists.id, set: body });
    reply.send();
  });

  app.patch('/lists/:id', {
    schema: {
      operationId: 'patchList',
      params: z.object({ id: z.uuid() }),
      body: apiSchema.ListSchema.partial(),
      response: responseSchema(z.undefined()),
    }
  }, async (request, reply) => {
    if (Object.keys(request.body).length === 0) {
      return reply.send();
    }
    db.update(lists).set(request.body).where(eq(lists.id, request.params.id));
    reply.send();
  });

  app.get('/lists/:listId/items', {
    schema: {
      operationId: 'getListItems',
      params: z.object({ listId: z.uuid() }),
      response: responseSchema(apiSchema.ItemSchema.array()),
    },
    links: {
      200: {
        getCreatedItem: {
          operationId: 'getListItem',
          parameters: {
            listId: '$response.body#/listId',
            id: '$response.body#/id'
          },
          description: 'Get the newly created item'
        },
      },
    },
  }, async (_, reply) => {
    const records = await db.select().from(items);
    reply.send(records);
  });

  app.get('/lists/:listId/items/:id', {
    schema: {
      operationId: 'getListItem',
      params: z.object({ listId: z.uuid(), id: z.uuid() }),
      response: responseSchema(apiSchema.ItemSchema),
    },
    links: {
      200: {
        getParentList: {
          operationId: 'getList',
          parameters: {
            id: '$response.body#/listId'
          },
          description: 'Get the list that owns this item'
        },
      },
    },
  }, async (request, reply) => {
    const { id, listId } = request.params;
    const records = await db.select().from(items).where(and(eq(items.listId, listId), eq(items.id, id)));
    if (records.length === 0) {
      return reply.code(404).send({ error: "Not Found" });
    }
    reply.send(records[0]);
  });

  app.post('/lists/:id/items', {
    schema: {
      operationId: 'createListItem',
      params: z.object({ id: z.uuid() }),
      body: apiSchema.CreateItemSchema,
      response: responseSchema(apiSchema.ItemSchema, 201),
    },
  }, async (request, reply) => {
    const record = await db.insert(items).values({ ...request.body, listId: request.params.id }).returning();
    reply.code(201).send(record[0]);
  });

  await app.ready();
  return app;
}

if (!process.env.AWS_LAMBDA_RUNTIME_API) {
  // called directly i.e. "ts-node api-handler.ts"
  (async function () {
    (await init()).listen({ port: 3000 }, (err) => {
      if (err) console.error(err);
      console.log('server listening on 3000');
    });
  })()
} 
