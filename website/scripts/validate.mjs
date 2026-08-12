import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const thisFile = fileURLToPath(import.meta.url);
const requiredFiles = [
  '.openai/hosting.json',
  'app/layout.tsx',
  'app/page.tsx',
  'app/download/page.tsx',
  'app/privacy/page.tsx',
  'app/support/page.tsx',
  'app/not-found.tsx',
  'app/robots.ts',
  'app/sitemap.ts',
  'app/manifest.ts',
  'public/favicon.svg',
  'public/overcap-icon.svg',
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', 'dist', '.next', '.vinext', '.wrangler'].includes(entry.name)) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

const failures = [];
const sourceFiles = await collectFiles(root);
const textFiles = sourceFiles.filter(
  (file) =>
    file !== thisFile &&
    !file.startsWith(path.join(root, 'build')) &&
    ['.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.svg'].includes(
      path.extname(file),
    ),
);

for (const relative of requiredFiles) {
  if (!sourceFiles.includes(path.join(root, relative))) failures.push(`Missing ${relative}`);
}

const combined = (
  await Promise.all(textFiles.map(async (file) => `${file}\n${await readFile(file, 'utf8')}`))
).join('\n');

const forbidden = [
  [
    'legacy product literal',
    new RegExp(`${['Open', 'Quota'].join('')}|${['dev', 'iffyy'].join('')}`),
  ],
  ['starter preview', /codex-preview|react-loading-skeleton|Your site is taking shape/],
  [
    'analytics or telemetry',
    /googletagmanager|google-analytics|plausible\.io|posthog|segment\.com|mixpanel/i,
  ],
  ['forbidden visual effect', /gradient\(|backdrop-filter|filter:\s*blur/i],
  ['Tailwind import', /@import\s+["']tailwindcss["']/],
];

for (const [label, pattern] of forbidden) {
  if (pattern.test(combined)) failures.push(`Found ${label}`);
}

const requiredCopy = [
  'See the limit.',
  'Before you hit it.',
  'Live quotas, reset times and spend across your coding tools',
  'SoftwareApplication',
  'No analytics',
  'Unknown publisher',
  'control-click Overcap',
  'Full upstream attribution',
  'https://github.com/AJ-Base44/overcap/releases/latest',
  '/media/overcap-dashboard.png',
  '/media/overcap-social.png',
];

for (const marker of requiredCopy) {
  if (!combined.includes(marker)) failures.push(`Missing required marker: ${marker}`);
}

const retiredBrandPattern = new RegExp(
  `${['AI', 'WITH', 'AJ'].join('')}|${['AI', 'with', 'AJ'].join(' ')}|${['ai', 'with', 'aj'].join('')}\\.dev`,
  'i',
);
for (const file of textFiles) {
  if (retiredBrandPattern.test(await readFile(file, 'utf8'))) {
    failures.push(`Found retired creator-brand copy in ${path.relative(root, file)}`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const hosting = JSON.parse(await readFile(path.join(root, '.openai/hosting.json'), 'utf8'));
if (packageJson.name !== 'overcap-website') failures.push('Unexpected package name');
if (packageJson.dependencies?.['drizzle-orm'] || packageJson.devDependencies?.['drizzle-kit'])
  failures.push('Static site must not include database dependencies');
if (
  packageJson.devDependencies?.tailwindcss ||
  packageJson.devDependencies?.['@tailwindcss/postcss']
)
  failures.push('Static site must not include unused Tailwind dependencies');
if (hosting.d1 !== null || hosting.r2 !== null) failures.push('Unexpected hosted storage binding');

if (failures.length > 0) {
  console.error(`Website validation failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Website validation passed (${textFiles.length} source files checked).`);
