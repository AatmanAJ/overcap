import type { Metadata } from 'next';
import { SiteFooter } from '../components/SiteFooter';
import { SiteHeader } from '../components/SiteHeader';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How the Overcap desktop app handles provider credentials, usage data and updates.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="legal-page shell">
        <p className="eyebrow eyebrow-accent">Plain-English privacy</p>
        <h1>Your usage stays on your machine.</h1>
        <p className="legal-intro">
          Overcap does not operate an account system, analytics service or cloud dashboard. The
          desktop app shows provider data locally and stores its settings locally.
        </p>

        <section className="legal-section">
          <h2>What Overcap reads</h2>
          <p>
            Overcap reads usage, limit, reset and spend information made available by the providers
            you connect. Depending on the provider, it can reuse an existing local login or use an
            API key you add in Customise.
          </p>
        </section>

        <section className="legal-section">
          <h2>Where credentials live</h2>
          <p>
            API keys entered in Overcap are stored by your operating system&apos;s credential store,
            not in the website or an Overcap account. Overcap has no account service. The app uses
            credentials only to request the provider data shown in your dashboard.
          </p>
        </section>

        <section className="legal-section">
          <h2>Network requests</h2>
          <p>The desktop app can connect to:</p>
          <ul>
            <li>The providers you enable, to retrieve your usage and limit data.</li>
            <li>GitHub, to check for an Overcap update and retrieve release metadata.</li>
          </ul>
          <p>Overcap does not send product analytics, behavioral telemetry or advertising data.</p>
        </section>

        <section className="legal-section">
          <h2>What this website collects</h2>
          <p>
            This website has no analytics, tracking pixels, advertising scripts, account forms or
            marketing cookies. Basic request logs may be retained by the hosting provider for
            security and delivery of the site.
          </p>
        </section>

        <section className="legal-section">
          <h2>Your control</h2>
          <p>
            You can disconnect providers, remove stored API keys and clear local Overcap data from
            the app. Uninstalling the app removes the application; your operating system may retain
            app preferences or credentials until you remove them through its normal tools.
          </p>
        </section>

        <section className="legal-section">
          <h2>Questions</h2>
          <p>
            Read the source on <a href="https://github.com/AJ-Base44/overcap">GitHub</a> or email{' '}
            <a href="mailto:aj@seebyond.com">aj@seebyond.com</a>. Last updated 11 August 2026.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
