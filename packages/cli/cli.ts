import { getDb, getDbUrl, testConnection } from "../db/connection";

async function main() {
  await testConnection();
  const db = await getDb();
  db.$client.end();
  console.error("Connection tested");
  process.stdout.write(await getDbUrl());
}

main();
