import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link className="brand footer-brand" href="/" aria-label="Overcap home">
            <img src="/overcap-icon.svg" alt="" width="32" height="32" />
            <span>Overcap</span>
          </Link>
          <p className="footer-note">Track usage and limits across your AI coding tools.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <div>
            <p>Product</p>
            <Link href="/#features">Features</Link>
            <Link href="/download">Download</Link>
            <a href="https://github.com/AJ-Base44/overcap/releases/latest">Release notes</a>
          </div>
          <div>
            <p>Project</p>
            <a href="https://github.com/AJ-Base44/overcap">GitHub</a>
            <Link href="/support">Support</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
          <div>
            <p>AIWITHAJ</p>
            <a href="https://aiwithaj.dev">aiwithaj.dev</a>
            <a href="mailto:aj@seebyond.com">Contact</a>
          </div>
        </nav>
      </div>
      <div className="shell footer-bottom">
        <p>Built by AIWITHAJ.</p>
        <p>
          <a href="https://github.com/AJ-Base44/overcap#credits">Full upstream attribution</a>.
        </p>
        <p>MIT licensed.</p>
      </div>
    </footer>
  );
}
