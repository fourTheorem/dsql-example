import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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

  console.log(url);
  return url;
})();

const dbPromise = (async function createDb() {
  const dbConfig = await dbUrlPromise;
  const client = postgres(dbConfig);
  return drizzle({ client, schema });
})();

export async function getDbConfig() {
  return await dbUrlPromise;
}

export async function getDb() {
  return await dbPromise;
}

export async function testConnection() {
  const db = await getDb();
  console.error("Performing a test query");
  const val = await db.execute("SELECT 1 + 1 AS result")
  console.error("Test query result:", val);
}

async function generateAdminToken() {
  const signer = new DsqlSigner({
    hostname: DB_ENDPOINT as string,
    region: AWS_REGION as string,
  });
  return await signer.getDbConnectAdminAuthToken();
}
