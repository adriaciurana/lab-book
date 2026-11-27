const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

async function startWorkspaceServer({ demo = false, prepare } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'labbook-browser-test-'));
  process.env.LABBOOK_DATA_DIR = directory;
  process.env.LABBOOK_CONFIG = path.join(directory, 'config.json');
  if (demo) process.env.NODE_ENV = 'test';
  if (prepare) await prepare(directory);
  const server = require('../../src/server/server.cjs');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  async function close() {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
  try {
    if (demo) await require('../../scripts/seed-test.cjs').seedTest({ base: origin, dataRoot: directory });
    return { origin, close };
  } catch (error) {
    await close();
    throw error;
  }
}

module.exports = { startWorkspaceServer };
