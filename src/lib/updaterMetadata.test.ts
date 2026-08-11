import { describe, expect, it } from 'vitest';
import { createUpdaterMetadata } from '../../.github/scripts/create-updater-json.mjs';

describe('release updater metadata', () => {
  const updaterArtifactNames = [
    'Overcap_0.2.0_x64-setup.exe',
    'Overcap_0.2.0_arm64-setup.exe',
    'Overcap_0.2.0_amd64.AppImage',
    'Overcap_0.2.0_arm64.AppImage',
    'Overcap_0.2.0_universal.app.tar.gz',
  ];
  const manualArtifactNames = ['Overcap_0.2.0_amd64.deb', 'Overcap_0.2.0_arm64.deb'];
  const release = {
    body: 'Release notes',
    created_at: '2026-07-14T00:00:00Z',
    assets: [
      ...updaterArtifactNames.flatMap((name, index) => [
        { id: index * 2 + 1, name },
        { id: index * 2 + 2, name: `${name}.sig` },
      ]),
      ...manualArtifactNames.map((name, index) => ({ id: 20 + index, name })),
      { id: 99, name: 'Overcap_0.2.0_universal.dmg' },
    ],
  };
  const signatures = Object.fromEntries(
    updaterArtifactNames.map((name) => [`${name}.sig`, `signature:${name}`]),
  );

  it('creates deterministic updater entries for every supported architecture', () => {
    const update = createUpdaterMetadata(
      release,
      signatures,
      'AJ-Base44/overcap',
      'v0.2.0',
      '0.2.0',
    );

    expect(update.platforms['windows-x86_64'].url).toBe(
      'https://github.com/AJ-Base44/overcap/releases/download/v0.2.0/Overcap_0.2.0_x64-setup.exe',
    );
    expect(update.platforms['windows-aarch64'].url).toContain('_arm64-setup.exe');
    expect(update.platforms['linux-aarch64'].url).toContain('_arm64.AppImage');
    expect(update.platforms['darwin-aarch64'].url).toContain('_universal.app.tar.gz');
    expect(Object.keys(update.platforms)).toHaveLength(14);
    expect(Object.keys(update.platforms)).toEqual(
      expect.arrayContaining([
        'windows-x86_64',
        'windows-aarch64',
        'linux-x86_64',
        'linux-aarch64',
        'darwin-x86_64',
        'darwin-aarch64',
      ]),
    );
    expect(Object.keys(update.platforms)).not.toEqual(
      expect.arrayContaining(['linux-x86_64-deb', 'linux-aarch64-deb']),
    );
    expect(Object.values(update.platforms).every(({ url }) => !url.endsWith('.deb'))).toBe(true);
  });

  it('keeps Debian packages as manual downloads without requiring updater signatures', () => {
    expect(() =>
      createUpdaterMetadata(release, signatures, 'AJ-Base44/overcap', 'v0.2.0', '0.2.0'),
    ).not.toThrow();

    expect(release.assets).toEqual(
      expect.arrayContaining(manualArtifactNames.map((name) => expect.objectContaining({ name }))),
    );
    expect(Object.keys(signatures).some((name) => name.endsWith('.deb.sig'))).toBe(false);
  });

  it('rejects a release whose manual Debian package is missing', () => {
    expect(() =>
      createUpdaterMetadata(
        {
          ...release,
          assets: release.assets.filter((asset) => asset.name !== 'Overcap_0.2.0_arm64.deb'),
        },
        signatures,
        'AJ-Base44/overcap',
        'v0.2.0',
        '0.2.0',
      ),
    ).toThrow('Expected one Linux ARM64 Debian package, found 0');
  });

  it('rejects a release whose ARM64 artifact is missing', () => {
    expect(() =>
      createUpdaterMetadata(
        {
          ...release,
          assets: release.assets.filter(
            (asset) => !asset.name.startsWith('Overcap_0.2.0_arm64-setup.exe'),
          ),
        },
        signatures,
        'AJ-Base44/overcap',
        'v0.2.0',
        '0.2.0',
      ),
    ).toThrow('Expected one Windows ARM64 NSIS installer, found 0');
  });
});
