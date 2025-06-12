import { ServerlessAdapter } from '@h4ad/serverless-adapter';
import { FastifyFramework } from '@h4ad/serverless-adapter/frameworks/fastify';
import { DefaultHandler } from '@h4ad/serverless-adapter/handlers/default';
import { PromiseResolver } from '@h4ad/serverless-adapter/resolvers/promise';
import { ApiGatewayV1Adapter } from '@h4ad/serverless-adapter/adapters/aws';

import { init } from './api';

const adapterHandlerPromise = (async function() {
  const app = await init();
  return ServerlessAdapter.new(app)
    .setFramework(new FastifyFramework())
    .setHandler(new DefaultHandler())
    .setResolver(new PromiseResolver())
    .addAdapter(new ApiGatewayV1Adapter())
    .build();
})();

export async function handleEvent() {
  console.log({ event: arguments[0] });
  const adapterHandler = await adapterHandlerPromise;
  return await adapterHandler(...arguments);
}
