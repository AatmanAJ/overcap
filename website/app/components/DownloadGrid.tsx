const latestRelease = 'https://github.com/AJ-Base44/overcap/releases/latest';

const platforms = [
  {
    name: 'Windows',
    kicker: 'Windows 10+',
    builds: 'x64 and ARM64',
    files: 'Choose the .exe ending in _x64-setup or _arm64-setup.',
    caveat:
      'The current beta is not code-signed. Windows may show an Unknown publisher or SmartScreen warning.',
  },
  {
    name: 'macOS',
    kicker: 'macOS 11+',
    builds: 'Apple Silicon and Intel',
    files: 'Choose the universal .dmg.',
    caveat:
      'The current beta is ad-hoc signed. If macOS blocks it, control-click Overcap, choose Open, then confirm.',
  },
  {
    name: 'Linux',
    kicker: '64-bit Linux',
    builds: 'x64 and ARM64',
    files: 'Choose an AppImage or Debian .deb package.',
    caveat:
      'For AppImage, allow the file to run as a program. Debian packages install with your normal package manager.',
  },
];

export function DownloadGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`download-grid${compact ? ' download-grid-compact' : ''}`}>
      {platforms.map((platform) => (
        <article className="download-card" key={platform.name}>
          <div className="download-card-top">
            <p className="eyebrow">{platform.kicker}</p>
            <h3>{platform.name}</h3>
            <p className="platform-builds">{platform.builds}</p>
          </div>
          <p>{platform.files}</p>
          {!compact && <p className="caveat">{platform.caveat}</p>}
          <a className="button button-small" href={latestRelease}>
            Download / {platform.name}
          </a>
        </article>
      ))}
    </div>
  );
}
