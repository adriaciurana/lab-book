const path = require('node:path');
const { initializeAdmin } = require('../src/server/accounts.cjs');

async function main() {
  const username = process.argv[2] || 'admin';
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 2048) throw Error('Initial password is too long.');
    chunks.push(chunk);
  }
  const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  const root = path.resolve(process.env.LABBOOK_DATA_DIR || path.join(__dirname, '../data'));
  const account = initializeAdmin(root, username, password);
  console.log('Initialized administrator '+account.username+'.');
}

main().catch(error=>{console.error(error.message);process.exitCode=1});
