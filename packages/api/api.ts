import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { getDb } from '../db/connection.ts';
import { items, lists } from '../model/schema.ts';
import fastifySwagger from '@fastify/swagger';
import { and, eq } from 'drizzle-orm';

type Item = typeof items.$inferInsert;
type ItemSelect = typeof items.$inferSelect
type List = typeof lists.$inferInsert;
type ListSelect = typeof lists.$inferSelect
type IdParams = { id: string; };

getDb();  // Initiate connection at module load time


type ApiReply<T> = T | {
  200: T;
  201: T,
  302: { url: string };
  '4xx': { error: string };
}


export async function init() {
  const app = fastify({ logger: true });

  const db = await getDb();

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'DSQL Example API',
        version: '0.1.0'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
    }
  });

  app.get('/openapi.json', { schema: { hide: true } }, async () => {
    return app.swagger();
  });

  app.get('/', { schema: { hide: true } }, (_, reply: FastifyReply) => {
    reply.send({ "hi": "there" });
  });

  app.get('/lists', async (_, reply: FastifyReply<{ Reply: ListSelect[] }>) => {
    const records = await db.select().from(lists);
    reply.send(records);
  });

  app.get<{ Params: IdParams, Reply: ApiReply<List> }>('/lists/:id', async (request, reply) => {
    const records = await db.select().from(lists).where(eq(lists.id, request.params.id))
    if (records.length === 0) {
      return reply.code(404);
    }
    reply.send(records[0]);
  });

  app.post<{ Body: List, Reply: ApiReply<List> }>('/lists', async (request, reply) => {
    const record = await db.insert(lists).values(request.body).returning();
    reply.code(201).send(record[0]);
  });

  app.delete<{ Params: IdParams, Reply: ApiReply<{}> }>('/lists/:id', (request, reply) => {
    db.delete(lists).where(eq(lists.id, request.params.id));
    reply.send({});
  });

  app.put<{ Params: IdParams, Body: List, Reply: ApiReply<{}> }>('/lists/:id', (request, reply) => {
    const { body, params: { id } } = request;
    db.insert(lists).values({ ...body, id })
      .onConflictDoUpdate({ target: lists.id, set: body });
    reply.send({});
  });

  app.patch<{ Body: List, Params: IdParams, Reply: ApiReply<{}> }>('/lists/:id', (request, reply) => {
    db.update(lists).set(request.body).where(eq(lists.id, request.params.id));
    reply.send({});
  });

  app.get<{ Reply: ApiReply<ItemSelect[]> }>('/lists/:listId/items', async (_, reply) => {
    const records = await db.select().from(items);
    reply.send(records);
  });

  app.get<{ Params: IdParams & { listId: string }, Reply: ApiReply<Item> }>('/lists/:listId/items/:id', async (request, reply) => {
    const { id, listId } = request.params;
    const records = await db.select().from(items).where(and(eq(items.listId, listId), eq(items.id, id)));
    if (records.length === 0) {
      return reply.code(404)
    }
    reply.send(records[0]);
  });

  await app.ready();

  return app;
}

if (!process.env.AWS_LAMBDA_RUNTIME_API) {
  // called directly i.e. "ts-node api-handler.ts"
  (async function() {
    (await init()).listen({ port: 3000 }, (err) => {
      if (err) console.error(err);
      console.log('server listening on 3000');
    });
  })()
} 
