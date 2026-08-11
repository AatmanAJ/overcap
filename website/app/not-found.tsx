import Link from "next/link";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="not-found shell">
        <p className="eyebrow eyebrow-accent">404 · Over the cap</p>
        <h1>This page hit its <span>limit.</span></h1>
        <p>The route does not exist. The app still does, and your dashboard is one click away.</p>
        <Link className="button" href="/">Back to Overcap</Link>
      </main>
      <SiteFooter />
    </>
  );
}
