import { testConnection, getDb } from "../db/connection";

async function main() {
  await testConnection();
  const db = await getDb();
  db.$client.end()
  console.error("Connection tested");
}

main();
