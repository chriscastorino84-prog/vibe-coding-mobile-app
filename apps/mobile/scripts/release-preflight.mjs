import { readFile } from 'node:fs/promises';

const app = JSON.parse(await readFile(new URL('../app.json', import.meta.url), 'utf8')).expo;
const required = [
  ['name', app.name],
  ['slug', app.slug],
  ['version', app.version],
  ['ios.bundleIdentifier', app.ios?.bundleIdentifier],
  ['android.package', app.android?.package],
  ['scheme', app.scheme],
];

const missing = required.filter(([, value]) => !value).map(([name]) => name);
if (missing.length > 0) {
  throw new Error(`Missing release configuration: ${missing.join(', ')}`);
}

const sourceFiles = [
  '../.env',
  '../.env.example',
  '../app.json',
  '../src',
];
const forbiddenSecretPatterns = [
  /(?:service[_-]?role|secret[_-]?key)\s*[:=]\s*['"][^'"]{12,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
];

async function collectFiles(path) {
  const entries = [];
  try {
    const directory = await import('node:fs/promises').then(({ readdir }) => readdir(new URL(path, import.meta.url), { withFileTypes: true }));
    for (const entry of directory) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) entries.push(...await collectFiles(child));
      else entries.push(child);
    }
  } catch {
    return entries;
  }
  return entries;
}

const files = [];
for (const sourceFile of sourceFiles) {
  if (sourceFile.endsWith('/src')) files.push(...await collectFiles(sourceFile));
  else files.push(sourceFile);
}
const secretFindings = [];
for (const file of files) {
  const content = await import('node:fs/promises').then(({ readFile }) => readFile(new URL(file, import.meta.url), 'utf8')).catch(() => '');
  if (forbiddenSecretPatterns.some((pattern) => pattern.test(content))) secretFindings.push(file);
}
if (secretFindings.length > 0) {
  throw new Error(`Potential private credential material found in release inputs: ${secretFindings.join(', ')}`);
}

if (app.ios.bundleIdentifier === app.android.package) {
  console.warn('iOS and Android identifiers are identical; confirm this is intentional before store submission.');
}

console.log(JSON.stringify({
  name: app.name,
  version: app.version,
  iosBundleIdentifier: app.ios.bundleIdentifier,
  androidPackage: app.android.package,
  scheme: app.scheme,
  status: 'ready-for-EAS-account-configuration',
}, null, 2));
