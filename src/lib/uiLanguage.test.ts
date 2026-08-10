import { describe, expect, it } from 'vitest';
import appSource from '../App.svelte?raw';
import packageSource from '../../package.json?raw';
import baseCss from '../styles/base.css?raw';
import sharedComponentCss from '../styles/components.css?raw';
import layoutCss from '../styles/layout.css?raw';
import tokensCss from '../styles/tokens.css?raw';
import customizeDetail from './CustomizeProviderDetail.svelte?raw';
import customizeList from './CustomizeProviderList.svelte?raw';
import dashboard from './Dashboard.svelte?raw';
import heroBarSource from './HeroGauge.svelte?raw';
import mainSource from '../main.ts?raw';
import motionSource from './motion.ts?raw';
import pageTransitionSource from './pageTransition.ts?raw';
import providerSparkline from './ProviderSparkline.svelte?raw';
import settings from './SettingsScreen.svelte?raw';
import shareReceiptSource from './shareCard.ts?raw';

const componentModules = import.meta.glob(['../App.svelte', './*.svelte'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const PROP_TYPE_WEIGHT = ['font', 'weight'].join('-');
const PROP_TYPE_STYLE = ['font', 'style'].join('-');
const PROP_CASE = ['text', 'transform'].join('-');
const ACCENT_TOKEN = ['--ac', 'cent'].join('');
const LIME = ['#c7', 'ff69'].join('');
const REMOVED_FAMILIES = [['Bebas', 'Neue'].join(' '), ['JetBrains', 'Mono'].join(' ')] as const;
const REMOVED_PACKAGES = [
  ['@fontsource', 'bebas-neue'].join('/'),
  ['@fontsource', 'jetbrains-mono'].join('/'),
  ['@fontsource', 'inter'].join('/'),
] as const;

const coLocatedComponentCss = Object.values(componentModules)
  .flatMap((source) =>
    Array.from(source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g), (match) => match[1]),
  )
  .join('\n');
const allCss = [tokensCss, baseCss, layoutCss, sharedComponentCss, coLocatedComponentCss].join(
  '\n',
);

interface Declaration {
  selector: string;
  property: string;
  value: string;
}

function declarations(source: string): Declaration[] {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g)).flatMap((rule) => {
    const selector = rule[1].trim().replace(/\s+/g, ' ');
    return Array.from(rule[2].matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;}]+)/gi), (declaration) => ({
      selector,
      property: declaration[1].toLowerCase(),
      value: declaration[2].trim(),
    }));
  });
}

function paletteValue(source: string, selector: string, property: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'))?.[1] ?? '';
  return block
    .match(new RegExp(`${property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`))?.[1]
    .trim();
}

function hex(first: string, second: string) {
  return `#${first}${second}`;
}

function luminance(color: string) {
  const channels = color
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const brighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (brighter + 0.05) / (darker + 0.05);
}

describe('Swiss instrument language contract', () => {
  it('uses the canonical warm palette and keeps 11px muted copy at AA contrast', () => {
    const light = {
      paper: paletteValue(tokensCss, ':root', '--paper'),
      ink: paletteValue(tokensCss, ':root', '--ink'),
      body: paletteValue(tokensCss, ':root', '--body'),
      muted: paletteValue(tokensCss, ':root', '--muted'),
      rule: paletteValue(tokensCss, ':root', '--rule'),
      faint: paletteValue(tokensCss, ':root', '--rule-faint'),
      accent: paletteValue(tokensCss, ':root', ACCENT_TOKEN),
      warning: paletteValue(tokensCss, ':root', '--warning'),
      critical: paletteValue(tokensCss, ':root', '--critical'),
    };
    expect(light).toMatchObject({
      paper: hex('fa', 'faf8'),
      ink: hex('16', '171a'),
      body: hex('3a', '3a38'),
      rule: hex('d9', 'd8d2'),
      faint: hex('e8', 'e7e2'),
      accent: LIME,
      warning: hex('b8', '860b'),
      critical: hex('c0', '392b'),
    });
    expect(contrastRatio(light.muted!, light.paper!)).toBeGreaterThanOrEqual(4.5);

    const darkPaper = paletteValue(tokensCss, ":root[data-theme='dark']", '--paper');
    const darkMuted = paletteValue(tokensCss, ":root[data-theme='dark']", '--muted');
    expect(darkPaper).toBe(hex('13', '1312'));
    expect(darkMuted).toBe(hex('85', '837c'));
    expect(contrastRatio(darkMuted!, darkPaper!)).toBeGreaterThanOrEqual(4.5);

    for (const declaration of [
      ['--ink', hex('f5', 'f4ef')],
      ['--body', hex('c9', 'c7c0')],
      ['--rule', hex('2e', '2d2a')],
      ['--rule-faint', hex('23', '2220')],
      ['--warning', hex('d4', 'a017')],
      ['--critical', hex('e0', '6055')],
    ] as const) {
      expect(paletteValue(tokensCss, ":root[data-theme='dark']", declaration[0])).toBe(
        declaration[1],
      );
    }
  });

  it('bundles only Inter Variable and enforces the fixed type scale', () => {
    const packageJson = JSON.parse(packageSource) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    const fontDependencies = [
      ...Object.keys(packageJson.dependencies),
      ...Object.keys(packageJson.devDependencies),
    ].filter((dependency) => dependency.startsWith('@fontsource'));
    expect(fontDependencies).toEqual(['@fontsource-variable/inter']);
    expect(packageJson.dependencies['@fontsource-variable/inter']).toBeTruthy();
    for (const dependency of REMOVED_PACKAGES) {
      expect(packageJson.dependencies).not.toHaveProperty(dependency);
    }
    expect(mainSource).toContain('@fontsource-variable/inter/wght.css');
    for (const family of REMOVED_FAMILIES) expect(allCss).not.toContain(family);

    expect(baseCss).toMatch(
      /\.hero-numeral\s*{[^}]*font-size:\s*52px;[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*-0\.04em;[^}]*tabular-nums lining-nums;/s,
    );
    expect(baseCss).toMatch(
      /\.hero-unit\s*{[^}]*font-size:\s*17px;[^}]*font-weight:\s*400;[^}]*vertical-align:\s*baseline;/s,
    );
    expect(baseCss).toMatch(
      /\.section-label\s*{[^}]*font-size:\s*11px;[^}]*font-weight:\s*500;[^}]*letter-spacing:\s*0\.09em;/s,
    );
    expect(
      declarations(baseCss).some(
        ({ selector, property, value }) =>
          selector === '.section-label' && property === PROP_CASE && value === 'uppercase',
      ),
    ).toBe(true);
    expect(baseCss).toMatch(
      /\.row-label\s*{[^}]*font-size:\s*12px;[^}]*font-weight:\s*400;[^}]*letter-spacing:\s*-0\.01em;/s,
    );
    expect(baseCss).toMatch(
      /\.row-figure\s*{[^}]*font-size:\s*12px;[^}]*font-weight:\s*400;[^}]*text-align:\s*right;/s,
    );
    expect(baseCss).toMatch(
      /body\s*{[^}]*font-size:\s*13px;[^}]*font-weight:\s*400;[^}]*line-height:\s*1\.5;/s,
    );
    expect(baseCss).toMatch(/button\s*{[^}]*font-size:\s*12px;[^}]*font-weight:\s*500;/s);
  });

  it('has exactly one uppercase style and no weight above 500 or italics', () => {
    const cssDeclarations = declarations(allCss);
    const uppercase = cssDeclarations.filter(
      ({ property, value }) => property === PROP_CASE && value === 'uppercase',
    );
    const heavy = cssDeclarations.filter(
      ({ property, value }) => property === PROP_TYPE_WEIGHT && Number.parseInt(value, 10) > 500,
    );
    const italics = cssDeclarations.filter(
      ({ property, value }) => property === PROP_TYPE_STYLE && value !== 'normal',
    );

    expect(uppercase.map(({ selector }) => selector)).toEqual(['.section-label']);
    expect(heavy).toEqual([]);
    expect(italics).toEqual([]);
  });

  it('applies tabular lining numerals to every shared figure class and export figure', () => {
    for (const selector of [
      '.metric',
      '.usage-row',
      '.value-row',
      '.status-row',
      '.trend-row',
      '.total-spend-section',
      '.model-usage-detail',
      '.reset-credits-detail',
      '[data-figure]',
    ]) {
      expect(baseCss).toContain(selector);
    }
    expect(
      baseCss.match(/font-variant-numeric:\s*tabular-nums lining-nums/g)?.length,
    ).toBeGreaterThanOrEqual(4);
    expect(heroBarSource).toContain('font-variant-numeric: tabular-nums lining-nums');
    expect(shareReceiptSource).toContain('font = `500 52px ${RECEIPT_FONT}`');
  });

  it('uses measured 200ms motion with a 4px plus opacity screen transition', () => {
    expect(tokensCss).toContain('--motion-measured: 200ms cubic-bezier(0.4, 0, 0.2, 1)');
    expect(motionSource).toContain('MEASURED_DURATION_MS = 200');
    expect(pageTransitionSource).toContain('PAGE_SLIDE_DISTANCE_PX = 4');
    expect(pageTransitionSource).toContain('translate3d');
    expect(pageTransitionSource).toContain('opacity: ${settledProgress}');
    expect(motionSource).not.toMatch(/bounce|spring|overshoot/i);
    expect(baseCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition:\s*none !important;/s,
    );
  });

  it('reserves lime for the hero fill, primary CTA, and current spark point', () => {
    const cssWithoutTokens = [baseCss, layoutCss, sharedComponentCss, coLocatedComponentCss].join(
      '\n',
    );
    const consumerPattern = new RegExp(`var\\(${ACCENT_TOKEN.replace('-', '\\-')}\\)`, 'g');
    expect(heroBarSource.match(consumerPattern)?.length).toBe(1);
    expect(sharedComponentCss.match(consumerPattern)?.length).toBe(1);
    expect(providerSparkline.match(consumerPattern)?.length).toBe(1);
    expect(cssWithoutTokens.match(consumerPattern)?.length).toBe(3);

    expect(heroBarSource).toMatch(/\.hero-gauge__fill\s*{[^}]*var\(--accent\)/s);
    expect(sharedComponentCss).toMatch(
      /\.pill-cta,[\s\S]*\[data-cta=['"]primary['"]\]\s*{[^}]*var\(--accent\)/s,
    );
    expect(providerSparkline).toMatch(/\.provider-sparkline__current\s*{[^}]*var\(--accent\)/s);
  });

  it('keeps the receipt paper-based with one 8px lime rule and Swiss type', () => {
    expect(shareReceiptSource).toContain(`paper: '${hex('fa', 'faf8')}'`);
    expect(shareReceiptSource).toContain(`ink: '${hex('16', '171a')}'`);
    expect(shareReceiptSource).toContain(`accent: '${LIME}'`);
    expect(shareReceiptSource).toContain('const RECEIPT_ACCENT_HEIGHT = 8');
    expect(shareReceiptSource).toContain('const RECEIPT_FONT = \'"Inter Variable"');
    expect(shareReceiptSource).toContain("context.fillText('OVERCAP'");
    expect(shareReceiptSource).toContain('context.lineWidth = 0.5');
    expect(shareReceiptSource).toContain("context.fillText('overcap.dev'");

    const limeUses = shareReceiptSource.match(new RegExp(LIME, 'g')) ?? [];
    expect(limeUses).toHaveLength(1);
    expect(shareReceiptSource).toMatch(
      /fillStyle = SHARE_RECEIPT_COLORS\.accent;[\s\S]*fillRect\(0, RECEIPT_HEADER_CONTENT_HEIGHT, width, RECEIPT_ACCENT_HEIGHT\);/,
    );
  });

  it('keeps provider identity colours unchanged in light and dark appearances', () => {
    for (const [provider, value] of [
      ['codex', hex('10', 'a37f')],
      ['claude', hex('de', '7356')],
      ['antigravity', hex('42', '85f4')],
      ['copilot', hex('a8', '55f7')],
      ['cursor', hex('13', '120a')],
      ['grok', hex('8e', '8e93')],
      ['opencode', hex('6e', '6e73')],
      ['openrouter', hex('64', '67f2')],
      ['zai', hex('2d', '2d2d')],
    ] as const) {
      expect(tokensCss).toContain(`--provider-${provider}: ${value}`);
    }
    expect(tokensCss).toMatch(
      /:root\[data-theme='dark'\][\s\S]*--provider-cursor:\s*#f5f5f7;[\s\S]*--provider-opencode:\s*#aeaeb2;/,
    );
    for (const [provider, value] of [
      ['', hex('19', 'c39a')],
      ['-cursor', hex('f5', 'f5f7')],
      ['-grok', hex('98', '989d')],
      ['-opencode', hex('ae', 'aeb2')],
      ['-zai', hex('d1', 'd1d6')],
    ] as const) {
      expect(paletteValue(tokensCss, ":root[data-theme='dark']", `--provider${provider}`)).toBe(
        value,
      );
    }
  });

  it('keeps visible navigation and controls concise, sentence case, and British-spelled', () => {
    expect(dashboard).toContain('Nothing connected yet. Add a provider in customise.');
    expect(dashboard).toContain('Open customise');
    expect(dashboard).toContain('Customise…');
    expect(dashboard).not.toContain('Open Customize');
    expect(dashboard).not.toContain('Customize…');

    for (const label of [
      'Show total spend',
      'Launch at login',
      'Global shortcut',
      'Icon style',
      'Window mode',
      'Usage display',
      'Check for updates automatically',
      'Check for updates…',
    ]) {
      expect(settings).toContain(label);
    }
    expect(settings).toContain('aria-label="Customise"');
    expect(settings).toContain('<b>Customise</b>');
    expect(appSource).toContain("return screen === 'settings' ? 'Settings' : 'Customise'");
    expect(customizeList).toContain('aria-label="Customise"');
    expect(customizeDetail).toContain(
      'aria-label={`Customise ${providerDisplayName(provider.id)}`}',
    );
  });
});
