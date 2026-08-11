import type { Metadata } from "next";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Overcap, report a bug or privately disclose a security issue.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-hero shell">
          <p className="eyebrow eyebrow-accent">Support</p>
          <h1>Stuck? Let’s get it unstuck.</h1>
          <p>
            Overcap is an early beta. Clear bug reports make it better quickly; private security
            reports keep everyone safer.
          </p>
        </header>
        <section className="support-grid shell" aria-label="Support options">
          <article className="support-card">
            <p className="eyebrow">Something broke</p>
            <h2>Report a bug</h2>
            <p>
              Tell us your operating system, provider, what you expected and what happened. Remove
              credentials, account details and private paths from screenshots or logs.
            </p>
            <a href="https://github.com/AJ-Base44/overcap/issues/new/choose">Open a bug report</a>
          </article>
          <article className="support-card">
            <p className="eyebrow">Security issue</p>
            <h2>Report it privately</h2>
            <p>
              Do not post security vulnerabilities in a public issue. Use GitHub’s private
              reporting flow so the details can be handled safely.
            </p>
            <a href="https://github.com/AJ-Base44/overcap/security/advisories/new">Private vulnerability report</a>
          </article>
          <article className="support-card">
            <p className="eyebrow">Install help</p>
            <h2>Get past the beta warning</h2>
            <p>
              The current beta is unsigned, so Windows and macOS may pause before opening it. The
              download page has short, platform-specific steps.
            </p>
            <a href="/download">Read install instructions</a>
          </article>
          <article className="support-card">
            <p className="eyebrow">Everything else</p>
            <h2>Contact AIWITHAJ</h2>
            <p>
              For questions that do not belong in a public issue, email the project contact. Please
              never send API keys, login tokens or provider credentials.
            </p>
            <a href="mailto:aj@seebyond.com">Email aj@seebyond.com</a>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
