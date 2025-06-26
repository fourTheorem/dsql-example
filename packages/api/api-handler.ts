import { Tracer } from "@aws-lambda-powertools/tracer";
import { ServerlessAdapter } from "@h4ad/serverless-adapter";
import { ApiGatewayV1Adapter } from "@h4ad/serverless-adapter/adapters/aws";
import { FastifyFramework } from "@h4ad/serverless-adapter/frameworks/fastify";
import { DefaultHandler } from "@h4ad/serverless-adapter/handlers/default";
import { PromiseResolver } from "@h4ad/serverless-adapter/resolvers/promise";
import type { Subsegment } from "aws-xray-sdk-core";

const tracer = new Tracer({ serviceName: "dsqlExample" });

import { init } from "./api";

const adapterHandlerPromise = (async () => {
  const app = await init();
  return ServerlessAdapter.new(app)
    .setFramework(new FastifyFramework())
    .setHandler(new DefaultHandler())
    .setResolver(new PromiseResolver())
    .addAdapter(new ApiGatewayV1Adapter())
    .build();
})();

export async function handleEvent() {
  const segment = tracer.getSegment(); // This is the facade segment (the one that is created by AWS Lambda)
  let subsegment: Subsegment | undefined;
  if (segment) {
    // Create subsegment for the function & set it as active
    subsegment = segment.addNewSubsegment(`## ${process.env._HANDLER}`);
    tracer.setSegment(subsegment);
  }

  // Annotate the subsegment with the cold start & serviceName
  tracer.annotateColdStart();
  tracer.addServiceNameAnnotation();

  const adapterHandler = await adapterHandlerPromise;
  const res = await adapterHandler(...arguments);

  console.log({ res });

  try {
    // Add the response as metadata
    tracer.addResponseAsMetadata({}, process.env._HANDLER);
  } catch (err) {
    console.error({ err });
    // Add the error as metadata
    tracer.addErrorAsMetadata(err as Error);
    throw err;
  } finally {
    if (segment && subsegment) {
      // Close subsegment (the AWS Lambda one is closed automatically)
      subsegment.close();
      // Set back the facade segment as active again
      tracer.setSegment(segment);
    }
  }
  return res;
}
