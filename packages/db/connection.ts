import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DsqlSigner } from "@aws-sdk/dsql-signer";
import * as schema from '../model/schema';


const { AWS_REGION, DB_ENDPOINT } = process.env;
if (!AWS_REGION || !DB_ENDPOINT) {
  throw new Error("AWS_REGION and DB_ENDPOINT environment variables must be set");
}

const dbUrlPromise = (async function createDbUrl() {
  let url;
  if (DB_ENDPOINT === "localhost") {
    url = `postgres://postgres:postgres@localhost:5432/postgres`;
  }
  else {
    const token = await generateAdminToken();
    const dbUser = "admin";
    const dbPort = 5432;
    const databaseName = "postgres";
    const encodedToken = encodeURIComponent(token);
    url = `postgres://${dbUser}:${encodedToken}@${DB_ENDPOINT}:${dbPort}/${databaseName}?sslmode=require`;
  }

  return url;
})();

const dbPromise = (async function createDb() {
  const dbUrl = await dbUrlPromise;
  let xrayPg;
  if (process.env.AWS_LAMBDA_RUNTIME_API) {
    const xraySdk = await import('aws-xray-sdk');
    xrayPg = xraySdk.capturePostgres(pg);
  } else {
    xrayPg = pg;
  }

  const client = new xrayPg.Client({
    connectionString: dbUrl,
  });
  await client.connect();
  return drizzle({ client, schema, logger: true });
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
  await db.execute("SELECT 1 + 1 AS result")
}

async function generateAdminToken() {
  const signer = new DsqlSigner({
    hostname: DB_ENDPOINT as string,
    region: AWS_REGION as string,
  });
  return await signer.getDbConnectAdminAuthToken();
}
