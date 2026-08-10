import { describe, expect, it } from 'vitest';
import appSource from '../App.svelte?raw';
import baseCss from '../styles/base.css?raw';
import componentCss from '../styles/components.css?raw';
import layoutCss from '../styles/layout.css?raw';
import tokensCss from '../styles/tokens.css?raw';
import tauriConfigSource from '../../src-tauri/tauri.conf.json?raw';
import heroBarSource from './HeroGauge.svelte?raw';
import sparklineSource from './ProviderSparkline.svelte?raw';

const componentModules = import.meta.glob(['../App.svelte', './*.svelte'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

const PROP_SURFACE = ['back', 'ground'].join('');
const PROP_SURFACE_COLOR = [PROP_SURFACE, 'color'].join('-');
const PROP_RADIUS = ['border', 'radius'].join('-');
const PROP_BOX_DEPTH = ['box', 'shadow'].join('-');
const PROP_BACKDROP = ['backdrop', 'filter'].join('-');
const SOFTENING_FUNCTION = ['bl', 'ur'].join('');
const DROP_DEPTH_FUNCTION = ['drop', 'shadow'].join('-');
const PAINT_RAMP = ['grad', 'ient'].join('');

interface CssSource {
  path: string;
  source: string;
}

interface CssDeclaration {
  path: string;
  selector: string;
  property: string;
  value: string;
}

const componentStyleSources: CssSource[] = Object.entries(componentModules).flatMap(
  ([path, source]) =>
    Array.from(source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g), (match, index) => ({
      path: `${path}#style-${index + 1}`,
      source: match[1],
    })),
);

const cssSources: CssSource[] = [
  { path: 'src/styles/tokens.css', source: tokensCss },
  { path: 'src/styles/base.css', source: baseCss },
  { path: 'src/styles/layout.css', source: layoutCss },
  { path: 'src/styles/components.css', source: componentCss },
  ...componentStyleSources,
];

const allCss = cssSources.map(({ source }) => source).join('\n');

function declarations(sources: CssSource[] = cssSources): CssDeclaration[] {
  return sources.flatMap(({ path, source }) =>
    Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g)).flatMap((rule) => {
      const selector = rule[1].trim().replace(/\s+/g, ' ');
      return Array.from(
        rule[2].matchAll(/(?:^|;)\s*([a-z-]+)\s*:\s*([^;}]+)/gi),
        (declaration) => ({
          path,
          selector,
          property: declaration[1].toLowerCase(),
          value: declaration[2].trim(),
        }),
      );
    }),
  );
}

function printDeclaration(declaration: CssDeclaration) {
  return `${declaration.path} :: ${declaration.selector} :: ${declaration.property}: ${declaration.value}`;
}

function isRootSurface(selector: string) {
  return /(^|,\s*)(:root|html|body|#app|\.popover)(?=\s|,|$)/.test(selector);
}

function isPrimaryAction(selector: string) {
  return /\.pill-cta|\[data-cta=['"]primary['"]\]/.test(selector);
}

function isMeasurementSurface(selector: string) {
  return /meter|progress|hero-gauge__(?:bar|fill)/.test(selector);
}

function isGridException(declaration: CssDeclaration, value: number) {
  if (declaration.property === 'font-size') return [11, 12, 13, 17, 52].includes(value);
  if (declaration.property === PROP_RADIUS)
    return value === 9999 && isPrimaryAction(declaration.selector);
  if (
    ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'].includes(
      declaration.property,
    )
  ) {
    if (value === 1 && declaration.selector.includes('.sr-only')) return true;
    if (value === 2 && /meter|usage-bar/.test(declaration.selector)) return true;
    if (value === 14 && declaration.selector.includes('.provider-sparkline')) return true;
  }
  if (declaration.property === 'transform' && value === -1) {
    return declaration.selector.includes('.hero-gauge__threshold');
  }
  return false;
}

const tauriConfig = JSON.parse(tauriConfigSource) as {
  app: {
    windows: Array<{
      transparent: boolean;
    }>;
  };
};

describe('Swiss instrument geometry contract', () => {
  it('keeps the native window opaque with one 16px window radius and 20px content padding', () => {
    expect(tauriConfig.app.windows[0].transparent).toBe(false);
    expect(
      declarations().some(
        ({ selector, property, value }) =>
          selector === '.popover' && property === PROP_SURFACE && value === 'var(--paper)',
      ),
    ).toBe(true);
    expect(appSource).toMatch(/\.content\s*{[^}]*padding:\s*20px;/s);

    const radiusDeclarations = declarations().filter(({ property }) => property === PROP_RADIUS);
    const windowRadius = radiusDeclarations.filter(({ selector }) => selector === '.popover');
    const actionRadius = radiusDeclarations.filter(({ selector }) => isPrimaryAction(selector));
    const unapproved = radiusDeclarations.filter(
      ({ selector }) => selector !== '.popover' && !isPrimaryAction(selector),
    );

    expect(windowRadius.map(({ value }) => value)).toEqual(['16px']);
    expect(actionRadius.map(({ value }) => value)).toEqual(['9999px']);
    expect(unapproved.map(printDeclaration)).toEqual([]);
  });

  it('renders the signature as a full-width 8px progress bar with one 1px threshold marker', () => {
    expect(heroBarSource).toContain('role="progressbar"');
    expect(heroBarSource).toContain('aria-valuenow={targetPercent}');
    expect(heroBarSource).toMatch(/\.hero-gauge\s*{[^}]*gap:\s*8px;/s);
    expect(heroBarSource).toMatch(/\.hero-gauge__bar\s*{[^}]*width:\s*100%;[^}]*height:\s*8px;/s);
    expect(heroBarSource).toMatch(
      /\.hero-gauge__threshold\s*{[^}]*width:\s*0;[^}]*height:\s*8px;[^}]*border-left:\s*1px solid var\(--ink\);/s,
    );
    expect(heroBarSource).toMatch(
      /\.hero-gauge__fill\s*{[^}]*transition:\s*width var\(--motion-measured\);/s,
    );
    expect(heroBarSource).not.toMatch(/<svg|<path|<circle|needle|redline|tick|notch/i);
  });

  it('uses 36px rule-separated provider rows and the prescribed inline measurements', () => {
    expect(layoutCss).toMatch(
      /\.metric,[\s\S]*\.status-row\s*{[^}]*height:\s*36px;[^}]*border-top:\s*0\.5px solid var\(--rule\);/s,
    );
    expect(layoutCss).toMatch(
      /\.provider-card > :first-child \.metric,[\s\S]*\.provider-card > \.status-row:first-child\s*{[^}]*border-top:\s*0;/s,
    );
    expect(layoutCss).toMatch(/\.meter,[\s\S]*\.meter-shell\s*{[^}]*height:\s*2px;/s);
    expect(layoutCss).toMatch(/\.meter__fill\s*{[^}]*var\(--muted\)/s);
    expect(sparklineSource).toContain('width: 56px');
    expect(sparklineSource).toContain('height: 14px');
    expect(sparklineSource).toContain('stroke-width: 1px');
    expect(sparklineSource).toContain('r="1.25"');
  });

  it('limits painted CSS surfaces to the window, one CTA treatment, and measurements', () => {
    const paintDeclarations = declarations().filter(({ property }) =>
      [PROP_SURFACE, PROP_SURFACE_COLOR].includes(property),
    );
    const unapproved = paintDeclarations.filter(({ selector }) => {
      return (
        !isRootSurface(selector) && !isPrimaryAction(selector) && !isMeasurementSurface(selector)
      );
    });

    expect(unapproved.map(printDeclaration)).toEqual([]);
    expect(
      paintDeclarations
        .filter(({ selector }) => isRootSurface(selector))
        .every(({ value }) => value === 'var(--paper)'),
    ).toBe(true);
    expect(
      paintDeclarations
        .filter(({ selector }) => isPrimaryAction(selector))
        .every(({ value }) => value === 'var(--accent)'),
    ).toBe(true);

    const inlinePaintPattern = new RegExp(
      `style(?::[a-z-]+|=)[^>\\n]*${PROP_SURFACE}(?:-${'color'})?\\s*:`,
      'i',
    );
    const inlinePaintSources = Object.entries(componentModules)
      .filter(([, source]) => inlinePaintPattern.test(source))
      .map(([path]) => path);
    expect(inlinePaintSources).toEqual([]);
  });

  it('contains no soft depth, backdrop effects, paint ramps, or transform scaling', () => {
    const depthDeclarations = declarations().filter(({ property, value }) => {
      if ([PROP_BOX_DEPTH, PROP_BACKDROP].includes(property)) return true;
      if (property === 'filter') {
        return (
          value.includes(`${SOFTENING_FUNCTION}(`) || value.includes(`${DROP_DEPTH_FUNCTION}(`)
        );
      }
      return false;
    });

    expect(depthDeclarations.map(printDeclaration)).toEqual([]);
    expect(allCss).not.toContain(`${PAINT_RAMP}(`);
    expect(allCss).not.toMatch(/transform\s*:[^;}]*scale/i);
  });

  it('keeps every CSS pixel measurement on the 4px grid apart from fixed contract exceptions', () => {
    const measuredProperties = new Set([
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'gap',
      'row-gap',
      'column-gap',
      'width',
      'height',
      'min-width',
      'max-width',
      'min-height',
      'max-height',
      'top',
      'right',
      'bottom',
      'left',
      'inset',
      'inset-inline',
      'inset-block',
      'outline-offset',
      PROP_RADIUS,
      'font-size',
      'line-height',
      'transform',
    ]);
    const violations: string[] = [];

    for (const declaration of declarations()) {
      if (!measuredProperties.has(declaration.property)) continue;
      for (const match of declaration.value.matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
        const value = Number(match[1]);
        if (value % 4 === 0 || isGridException(declaration, value)) continue;
        violations.push(`${printDeclaration(declaration)} [${value}px]`);
      }
    }

    const iconViolations = Object.entries(componentModules).flatMap(([path, source]) =>
      Array.from(source.matchAll(/\bsize=\{(\d+)\}/g), (match) => Number(match[1]))
        .filter((value) => value % 4 !== 0)
        .map((value) => `${path} :: component size={${value}}`),
    );

    expect([...violations, ...iconViolations]).toEqual([]);
  });
});
