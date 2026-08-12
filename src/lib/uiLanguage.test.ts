import { describe, expect, it } from 'vitest';
import layoutCss from '../styles/layout.css?raw';
import sharedComponentCss from '../styles/components.css?raw';
import tokensCss from '../styles/tokens.css?raw';
import customizeDetail from './CustomizeProviderDetail.svelte?raw';
import customizeList from './CustomizeProviderList.svelte?raw';
import dashboard from './Dashboard.svelte?raw';
import heroGauge from './HeroGauge.svelte?raw';
import overcapMark from './OvercapMark.svelte?raw';
import providerNameSection from './ProviderNameSection.svelte?raw';
import providerSparkline from './ProviderSparkline.svelte?raw';
import settings from './SettingsScreen.svelte?raw';
import shareCard from './shareCard.ts?raw';
import statusMetric from './StatusMetric.svelte?raw';
import { coLocatedComponentCss } from './uiStyleSources';

const css = `${tokensCss}\n${layoutCss}\n${sharedComponentCss}\n${coLocatedComponentCss}`;

describe('native UI language contract', () => {
  it('uses the Overcap instrument type system and reference type sizes', () => {
    expect(tokensCss).toContain("--font-ui: 'Inter'");
    expect(tokensCss).toContain("--font-mono: 'JetBrains Mono'");
    expect(tokensCss).toContain('--font-display: var(--font-ui)');
    expect(tokensCss).not.toMatch(/--font-display:[^;]*Impact/);
    expect(css).toMatch(/\.metric\s*{[^}]*font-family: var\(--font-mono\);/s);
    expect(css).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/\.provider-header h1\s*{[^}]*font-size: 14px;[^}]*font-weight: 600;/s);
    expect(css).toMatch(/\.provider-list-main b\s*{[^}]*font-size: 14px;[^}]*font-weight: 600;/s);
    expect(css).toMatch(/\.setting-row\s*{[^}]*font-size: 13px;/s);
  });

  it('keeps shared surfaces flat and shared entrances free of opacity crossfades', () => {
    const sharedCss = `${layoutCss}\n${sharedComponentCss}`;
    expect(sharedCss).not.toMatch(/(?:linear|radial|conic)-gradient\(/);
    expect(sharedCss).not.toContain('backdrop-filter');
    expect(sharedCss).not.toMatch(/transition:[^;]*opacity/s);
    expect(sharedComponentCss).toMatch(/@keyframes detail-in\s*{[^}]*translateY\(6px\)/s);
    expect(sharedComponentCss).not.toMatch(/@keyframes (?:detail|menu)-in[\s\S]*?opacity:/);
  });

  it('uses one Signal Orange across the product accent roles', () => {
    expect(tokensCss).toContain('--signal: #f04b2f;');
    expect(heroGauge).toContain('stroke: var(--meter-fill);');
    expect(providerSparkline).toContain('fill: var(--spark-current);');
    expect(sharedComponentCss).toContain('background: var(--action-fill);');
    expect(shareCard).toContain("signal: '#f04b2f'");
    expect(shareCard).toContain('RECEIPT_HEADER_HEIGHT - 6');

    for (const source of [layoutCss, sharedComponentCss, customizeDetail, statusMetric]) {
      expect(source).not.toContain('var(--meter-fill)');
    }

    expect(overcapMark).toContain('stroke="currentColor"');
    expect(overcapMark).toContain('overcap-mark__cap');
    expect(overcapMark).not.toContain('overcap-mark.png');
    expect(overcapMark).not.toContain('#f04b2f');
  });

  it('exposes the audited warm light and dark palettes', () => {
    for (const value of [
      '#f3f1ea',
      '#fcfbf7',
      '#12161b',
      '#343a40',
      '#5c646b',
      '#c9c7be',
      '#747a7f',
      '#dedcd4',
      '#a36500',
      '#b52c2c',
      '#0e1115',
      '#151a20',
      '#f2f0e9',
      '#c7c9c6',
      '#91979d',
      '#343b43',
      '#66717c',
      '#232930',
      '#e8b04b',
      '#ff6b62',
    ]) {
      expect(tokensCss).toContain(value);
    }
  });

  it('keeps the critical flame colored while its warning copy stays secondary', () => {
    expect(css).not.toMatch(/\.metric__heading span\s*{/);
    expect(css).toMatch(
      /\.metric__heading \.pace-warning__icon\s*{[^}]*color: var\(--meter-critical\);/s,
    );
    expect(css).toMatch(/\.metric__heading \.pace-warning\s*{[^}]*color: var\(--secondary\);/s);
  });

  it('keeps spend providers visually distinct in both appearances', () => {
    for (const provider of ['claude', 'codex', 'cursor', 'grok', 'opencode', 'openrouter']) {
      expect(tokensCss).toContain(`--provider-${provider}:`);
    }
    expect(tokensCss).toMatch(
      /@media \(prefers-color-scheme: dark\)[\s\S]*--provider-cursor: #f5f5f7;[\s\S]*--provider-opencode: #aeaeb2;/,
    );
    expect(tokensCss).toMatch(
      /:root\[data-theme='dark'\][\s\S]*--provider-cursor: #f5f5f7;[\s\S]*--provider-opencode: #aeaeb2;/,
    );
  });

  it('keeps Customize concise and free of duplicate status and count copy', () => {
    expect(customizeList).toContain('Notifications, appearance and more');
    expect(customizeList).toContain('{provider.metrics.length} metrics');
    expect(customizeList).not.toContain('Detected locally');
    expect(customizeList).not.toContain('screen-intro');
    expect(customizeList).not.toContain('pinned\n');
    expect(customizeDetail).toContain('Drag metrics here');
    expect(customizeDetail).toContain('Starred for menu bar');
    expect(customizeDetail).toContain('Removed from menu bar');
    expect(customizeDetail).toContain('Up to 2 stars per provider');
    expect(customizeDetail).not.toContain('provider-toggle-row');
    expect(customizeDetail).not.toContain('section-divider');
    expect(customizeDetail).not.toContain('of 2 pinned');
  });

  it('uses the shared Settings labels and single-line control rows', () => {
    for (const label of [
      'General',
      'Show Total Spend',
      'Launch at Login',
      'Global Shortcut',
      'Icon Style',
      'Appearance',
      'Window Mode',
      'Usage Display',
      'Notifications',
      'Advanced',
      'Updates',
      'Application',
      'Check for Updates Automatically',
      'Check for Updates…',
    ]) {
      expect(settings).toContain(label);
    }
    expect(settings).toContain("{ value: 'system', label: 'Auto' }");
    expect(settings).toContain("{ value: 'twelveHour', label: '12-hour' }");
    expect(settings).toContain("{ value: 'twentyFourHour', label: '24-hour' }");
    expect(settings).not.toContain('<h2>Startup</h2>');
    expect(settings).not.toContain('Automatic Checks');
    expect(settings).not.toContain('Combined cost and token summary.');
    expect(settings).not.toContain('Show projections even when usage is healthy.');
    expect(settings).not.toContain('>×</button');
  });

  it('keeps dashboard onboarding, empty state, and menus on the shared wording', () => {
    expect(dashboard).toContain('Welcome to Overcap');
    expect(dashboard).toContain('Open Customize');
    expect(dashboard).toContain('Nothing connected yet. Add a provider in customise.');
    expect(dashboard).toContain('Customize…');
    expect(dashboard).toContain('Refresh {providerDisplayName(menuProvider.id)}');
    expect(dashboard).not.toContain('Providers Detected');
    expect(dashboard).not.toContain('Starter Provider');
    expect(dashboard).not.toContain("Expand'} On Demand");
    expect(dashboard).not.toContain('>×</button');
  });

  it('keeps interactive highlights in the component layer that owns their base style', () => {
    expect(providerNameSection).toMatch(
      /\.provider-name-card:focus-within\s*{[^}]*outline: 1px solid/s,
    );
    expect(providerNameSection).toMatch(/input\s*{[^}]*display: block;/s);
    expect(dashboard).toMatch(
      /\.context-menu button:not\(:disabled\):hover,[\s\S]*background: var\(--button-hover\);/,
    );
    expect(sharedComponentCss).not.toContain('.context-menu button:hover');
  });
});
