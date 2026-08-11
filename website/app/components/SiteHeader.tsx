import Link from "next/link";

const repoUrl = "https://github.com/AJ-Base44/overcap";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/" aria-label="Overcap home">
          <img src="/overcap-icon.svg" alt="" width="32" height="32" />
          <span>Overcap</span>
        </Link>
        <nav className="main-nav" aria-label="Primary navigation">
          <Link href="/#features">Features</Link>
          <Link href="/download">Download</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
        </nav>
        <a className="header-github" href={repoUrl} aria-label="View Overcap on GitHub">
          GitHub
        </a>
      </div>
    </header>
  );
}
