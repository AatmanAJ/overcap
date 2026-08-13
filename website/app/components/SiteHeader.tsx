import Image from 'next/image';
import Link from 'next/link';

const repoUrl = 'https://github.com/AJ-Base44/overcap';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Overcap home">
          <Image className="brand-icon" src="/overcap-icon.svg" alt="" width={22} height={22} aria-hidden="true" />
          <span>OVERCAP</span>
        </Link>
        <p className="operator-mark">
          <span>CAP—01</span> Live capacity monitor
        </p>
        <nav className="main-nav" aria-label="Primary navigation">
          <Link href="/#features">System</Link>
          <Link href="/download">Download</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
          <a href={repoUrl}>GitHub ↗</a>
        </nav>
      </div>
    </header>
  );
}
