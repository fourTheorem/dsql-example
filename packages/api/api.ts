import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { getDb } from '../db/connection.ts';
import { itemsTable } from '../model/item.ts';
import fastifySwagger from '@fastify/swagger';
import { eq } from 'drizzle-orm';

type Item = typeof itemsTable.$inferInsert;
type IdParams = { id: string; };
type ItemPostBody = Omit<Item, keyof IdParams>;

getDb();  // Initiate connection at module load time

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

  app.get('/items', async (_, reply: FastifyReply) => {
    const items = await db.select().from(itemsTable).limit(1);
    reply.send({ items });
  });

  app.post('/items', async (request: FastifyRequest<{ Body: ItemPostBody }>, reply: FastifyReply) => {
    db.insert(itemsTable).values(request.body).returning();
    reply.send({});
  });

  app.delete('/items/:id', (request: FastifyRequest<{ Params: IdParams }>, reply: FastifyReply) => {
    db.delete(itemsTable).where(eq(itemsTable.id, request.params.id));
  });

  app.put('/items/:id', (request: FastifyRequest<{ Body: Item | ItemPostBody, Params: IdParams }>, reply: FastifyReply) => {
    db.update(itemsTable).set(request.body).where(eq(itemsTable.id, request.params.id));
    reply.send({});
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
