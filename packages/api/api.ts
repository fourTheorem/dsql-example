import fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { getDb } from '../db/connection';
import { itemsTable } from '../model/item';

const dbPromise = getDb();

export function init() {
  const app = fastify();
  app.get('/', (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ "hi": "there" });
  });

  app.get('/items', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await dbPromise;
    console.log("Getting items");
    const items = await db.select().from(itemsTable).limit(1);
    console.log("Got items", items);
    reply.send({ items });
  });
  return app;
}

if (require.main === module) {
  // called directly i.e. "ts-node api-handler.ts"
  init().listen({ port: 3000 }, (err) => {
    if (err) console.error(err);
    console.log('server listening on 3000');
  });
} 
