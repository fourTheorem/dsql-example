import { Metrics } from "@aws-lambda-powertools/metrics";
import { Tracer } from "@aws-lambda-powertools/tracer";

const namespace = "fourTheorem";
const serviceName = "dsqlExample";

export const tracer = new Tracer({ serviceName });
export const metrics = new Metrics({ serviceName, namespace });
