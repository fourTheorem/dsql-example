import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../model/schema";

const { AWS_REGION, DB_ENDPOINT } = process.env;
if (!AWS_REGION || !DB_ENDPOINT) {
  throw new Error(
    "AWS_REGION and DB_ENDPOINT environment variables must be set",
  );
}

async function withTiming<T>(segmentName: string, context: () => Promise<T>) {
  if (!process.env.AWS_LAMBDA_RUNTIME_API) {
    return await context();
  }
  const start = performance.now();
  try {
    const result = await context();
    return result;
  } catch (error) {
    throw error;
  } finally {
    const end = performance.now();
    const durationMs = end - start;

    const { MetricUnit } = await import("@aws-lambda-powertools/metrics");
    const { metrics } = await import("../api/common");
    metrics.addMetric(
      `${segmentName}Duration`,
      MetricUnit.Milliseconds,
      durationMs,
    );
    metrics.publishStoredMetrics();
  }
}

const dbUrlPromise = (async function createDbUrl() {
  let url: string;
  if (DB_ENDPOINT === "localhost") {
    url = `postgres://postgres:postgres@localhost:5432/postgres`;
  } else {
    url = await withTiming("DbUrlTime", async () => {
      const token = await generateAdminToken();
      const dbUser = "admin";
      const dbPort = 5432;
      const databaseName = "postgres";
      const encodedToken = encodeURIComponent(token);
      return `postgres://${dbUser}:${encodedToken}@${DB_ENDPOINT}:${dbPort}/${databaseName}?sslmode=require`;
    });
  }

  return url;
})();

const dbPromise = (async function createDb() {
  const dbUrl = await dbUrlPromise;
  return withTiming("DbTime", async () => {
    let xrayPg: typeof pg;
    if (process.env.AWS_LAMBDA_RUNTIME_API) {
      const xraySdk = await import("aws-xray-sdk");
      xrayPg = xraySdk.capturePostgres(pg) as typeof pg;
    } else {
      xrayPg = pg;
    }

    const client = new xrayPg.Client({
      connectionString: dbUrl,
    });
    await client.connect();
    return drizzle({ client, schema });
  });
})();

export async function getDbUrl() {
  return await dbUrlPromise;
}

export async function getDb() {
  return await dbPromise;
}

export async function testConnection() {
  const db = await getDb();
  console.error("Performing a test query");
  await db.execute("SELECT 1 + 1 AS result");
}

async function generateAdminToken() {
  const signer = new DsqlSigner({
    hostname: DB_ENDPOINT as string,
    region: AWS_REGION as string,
  });
  return await signer.getDbConnectAdminAuthToken();
}
