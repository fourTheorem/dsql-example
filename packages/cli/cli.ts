import { testConnection } from "../db/connection.ts";
import wtf from 'wtfnode';

async function main() {
  await testConnection();
  console.error("Connection tested");
}

process.on('exit', (code) => {
  console.error(`Process exited with code: ${code}`);

  wtf.dump();
});

main();
