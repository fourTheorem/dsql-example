import { ServerlessAdapter } from '@h4ad/serverless-adapter';
import { FastifyFramework } from '@h4ad/serverless-adapter/frameworks/fastify';
import { DefaultHandler } from '@h4ad/serverless-adapter/handlers/default';
import { PromiseResolver } from '@h4ad/serverless-adapter/resolvers/promise';
import { ApiGatewayV1Adapter } from '@h4ad/serverless-adapter/adapters/aws';

import { init } from './api';

const app = init();

export const handleEvent = ServerlessAdapter.new(app)
  .setFramework(new FastifyFramework())
  .setHandler(new DefaultHandler())
  .setResolver(new PromiseResolver())
  .addAdapter(new ApiGatewayV1Adapter())
  .build();

