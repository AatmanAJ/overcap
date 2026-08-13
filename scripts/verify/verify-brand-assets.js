import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const readText = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const readBytes = (path) => fs.readFileSync(new URL(path, root));

const canonicalPath = 'assets/overcap-icon.svg';
const canonical = readText(canonicalPath);
const tray = readText('assets/overcap-tray.svg');
const appMark = readText('src/lib/OvercapMark.svelte');
const readme = readText('README.md');

const canonicalRing =
  'M448 224A296 296 0 1 0 448 816A296 296 0 1 0 448 224ZM448 324A196 196 0 1 1 448 716A196 196 0 1 1 448 324Z';
const trayRing =
  'M13.75 6.75A9.25 9.25 0 1 0 13.75 25.25A9.25 9.25 0 1 0 13.75 6.75ZM13.75 9.875A6.125 6.125 0 1 1 13.75 22.125A6.125 6.125 0 1 1 13.75 9.875Z';

function fail(message) {
  throw new Error(`Brand asset contract failed: ${message}`);
}

function hasTagWithAttributes(source, tagName, attributes) {
  const tags = source.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) ?? [];
  return tags.some((tag) =>
    Object.entries(attributes).every(([name, value]) => {
      const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
      return match?.[1] === value;
    }),
  );
}

function assertClosedFilledRing(source, expectedPath, label) {
  if (!hasTagWithAttributes(source, 'path', { 'fill-rule': 'evenodd', d: expectedPath })) {
    fail(`${label} must use the locked closed, even-odd filled ring.`);
  }

  if (/\bstroke(?:-[a-z]+)?\s*=/i.test(source)) {
    fail(`${label} must not use stroke-based or open-C geometry.`);
  }
}

assertClosedFilledRing(canonical, canonicalRing, canonicalPath);

if (
  !hasTagWithAttributes(canonical, 'rect', {
    x: '550',
    y: '238',
    width: '250',
    height: '76',
    rx: '38',
  })
) {
  fail(`${canonicalPath} must keep the seated cap at x=550 y=238 width=250 height=76 rx=38.`);
}

const canonicalBytes = readBytes(canonicalPath);
for (const publicCopy of ['website/public/favicon.svg', 'website/public/overcap-icon.svg']) {
  if (!canonicalBytes.equals(readBytes(publicCopy))) {
    fail(`${publicCopy} must be byte-identical to ${canonicalPath}.`);
  }
}

if (/^##\s+Demo\s*$/im.test(readme)) {
  fail('README.md must not contain a Demo section.');
}
if (/overcap-(?:dashboard|customise)-demo/i.test(readme)) {
  fail('README.md must not embed the retired dashboard or customise demo media.');
}

assertClosedFilledRing(tray, trayRing, 'assets/overcap-tray.svg');

if (!/fill-rule=["']evenodd["']/i.test(appMark)) {
  fail('src/lib/OvercapMark.svelte must use an even-odd filled ring.');
}
if (/\bstroke(?:-[a-z]+)?\s*=/i.test(appMark)) {
  fail('src/lib/OvercapMark.svelte must not use stroke-based or open-C geometry.');
}
if (
  !hasTagWithAttributes(appMark, 'rect', {
    x: '13.2',
    y: '4',
    width: '5.8',
  })
) {
  fail('src/lib/OvercapMark.svelte must keep its seated cap at x=13.2 y=4 width=5.8.');
}

console.log('Brand assets use the closed Overcap mark and stay synchronized across app and site.');
