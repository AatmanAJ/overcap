import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-top">
        <Link className="brand footer-brand" href="/" aria-label="Overcap home">
          <span className="brand-mark brand-mark-dark" aria-hidden="true">
            <i />
          </span>
          <span>OVERCAP</span>
        </Link>
        <p>Live quotas, reset times and spend across your coding tools.</p>
        <p className="footer-signal">Open source capacity monitor.</p>
      </div>
      <div className="shell footer-grid">
        <nav className="footer-links" aria-label="Footer navigation">
          <div>
            <p>Product</p>
            <Link href="/#features">System</Link>
            <Link href="/download">Download</Link>
            <a href="https://github.com/AJ-Base44/overcap/releases/latest">Release notes</a>
          </div>
          <div>
            <p>Project</p>
            <a href="https://github.com/AJ-Base44/overcap">Source</a>
            <Link href="/support">Support</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
          <div>
            <p>Contact</p>
            <a href="mailto:aj@seebyond.com">aj@seebyond.com</a>
            <a href="https://github.com/AJ-Base44/overcap#credits">Full upstream attribution</a>
          </div>
        </nav>
      </div>
      <div className="shell footer-bottom">
        <p>© 2026 Overcap project</p>
        <p>MIT licensed</p>
        <p>overcap.dev</p>
      </div>
    </footer>
  );
}
