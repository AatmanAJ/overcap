import Link from 'next/link';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="not-found shell">
        <p className="signal-label">
          <span aria-hidden="true" />
          404 / No signal
        </p>
        <h1>
          This page hit its <span>limit.</span>
        </h1>
        <p>The route does not exist. Overcap still does.</p>
        <Link className="button" href="/">
          Return to Overcap
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
