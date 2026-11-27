const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const usernamePattern = /^[a-z][a-z0-9_.-]{2,47}$/;

function passwordRecord(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw Error('Passwords must be 12–256 characters.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

function verifyPassword(password, account) {
  if (!account || typeof password !== 'string' || password.length > 256) return false;
  const expected = Buffer.from(account.password.hash, 'hex');
  const actual = crypto.scryptSync(password, account.password.salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function initializeAdmin(dataRoot, username, password) {
  username = String(username).trim().toLowerCase();
  if (!usernamePattern.test(username)) throw Error('Use 3–48 letters, digits, dots, underscores or hyphens, starting with a letter.');
  const account = {
    id: crypto.randomUUID(), username, role: 'admin',
    password: passwordRecord(password), mustChangePassword: true
  };
  const directory = path.join(dataRoot, 'private');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, 'accounts.json');
  const temporary = path.join(directory, crypto.randomUUID()+'.tmp');
  try {
    fs.writeFileSync(temporary, JSON.stringify({ accounts: [account] }, null, 2)+'\n', { mode: 0o600, flag: 'wx' });
    fs.linkSync(temporary, filename);
  } catch (error) {
    if (error.code === 'EEXIST') throw Error('An administrator has already been initialized.');
    throw error;
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  return { id: account.id, username };
}

module.exports = { usernamePattern, initializeAdmin, passwordRecord, verifyPassword };
