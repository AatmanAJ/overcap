import Image from 'next/image';
import { DownloadGrid } from './components/DownloadGrid';
import { SiteFooter } from './components/SiteFooter';
import { SiteHeader } from './components/SiteHeader';

const releaseUrl = 'https://github.com/AJ-Base44/overcap/releases/latest';

const features = [
  {
    index: '01',
    label: 'Priority',
    title: 'The tightest limit wins',
    body: 'Overcap checks every connected quota and puts the constraint that needs attention at the top.',
  },
  {
    index: '02',
    label: 'Pace',
    title: 'Know when the line gets crossed',
    body: 'Burn-rate projections show whether your current pace reaches the cap before the next reset.',
  },
  {
    index: '03',
    label: 'History',
    title: 'Seven days, one clean trace',
    body: 'Compact sparklines expose sudden jumps and steady climbs without turning the app into a spreadsheet.',
  },
  {
    index: '04',
    label: 'Alerts',
    title: 'Warnings at the right moment',
    body: 'Set 80, 95 and 100 percent thresholds globally, then tune individual providers when you need to.',
  },
  {
    index: '05',
    label: 'Spend',
    title: 'See where the month is heading',
    body: 'Month-to-date cost sits beside a plain projection, so the next bill is easier to read before it lands.',
  },
  {
    index: '06',
    label: 'Receipt',
    title: 'Export the useful part',
    body: 'Turn the current picture into a compact PNG receipt with provider names, usage and estimated spend.',
  },
];

const providers = [
  'Claude Code',
  'Codex',
  'Cursor',
  'Antigravity',
  'GitHub Copilot',
  'Devin',
  'Grok',
  'OpenCode',
  'OpenRouter',
  'Z.ai',
  'Kimi',
  'MiniMax',
];

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Overcap',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Windows 10+, macOS 11+, Linux',
  softwareVersion: '0.1.1',
  url: 'https://overcap.dev',
  downloadUrl: releaseUrl,
  codeRepository: 'https://github.com/AJ-Base44/overcap',
  license: 'https://opensource.org/license/mit',
  author: {
    '@type': 'Organization',
    name: 'Overcap',
    url: 'https://overcap.dev',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="signal-label">
              <span aria-hidden="true" />
              Live capacity monitor / 01
            </p>
            <h1 id="hero-title">
              See the limit.
              <span>Before you hit it.</span>
            </h1>
            <p className="hero-lede">
              Live quotas, reset times and spend across your coding tools.
            </p>
            <div className="hero-actions">
              <a className="button" href={releaseUrl}>
                Download Overcap
              </a>
              <a className="text-link" href="https://github.com/AJ-Base44/overcap">
                Inspect the source <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="hero-spec" aria-label="Availability">
              <span>Windows</span>
              <span>macOS</span>
              <span>Linux</span>
              <span>No account</span>
            </div>
          </div>

          <figure className="hero-instrument">
            <div className="instrument-header">
              <span>OVERCAP / LIVE</span>
              <span className="live-status">
                <i aria-hidden="true" /> Local feed
              </span>
            </div>
            <div className="instrument-screen">
              <Image
                src="/media/overcap-dashboard.png"
                width="434"
                height="912"
                alt="Overcap showing a live quota, reset projection, spend and provider history"
                priority
                sizes="(max-width: 720px) calc(100vw - 32px), 400px"
              />
            </div>
            <figcaption>
              <span>CAPACITY MONITOR</span>
              <span>DESKTOP / 0.1.1</span>
            </figcaption>
          </figure>
        </section>

        <section className="status-strip" aria-label="Product facts">
          <div className="shell status-grid">
            <p>
              <span>12</span>
              <strong>provider inputs</strong>
            </p>
            <p>
              <span>03</span>
              <strong>desktop platforms</strong>
            </p>
            <p>
              <span>00</span>
              <strong>tracking scripts</strong>
            </p>
            <p>
              <span>01</span>
              <strong>limit to watch</strong>
            </p>
          </div>
        </section>

        <section className="section shell" id="features" aria-labelledby="features-title">
          <div className="section-index">
            <p>01 / Readout</p>
            <p>From signal to decision</p>
          </div>
          <div className="section-heading">
            <h2 id="features-title">
              The useful answer.
              <br />
              Nothing around it.
            </h2>
            <p>
              Overcap turns the usage data already available from your tools into a fast read on
              what is tight, what is accelerating and what resets next.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-row" key={feature.index}>
                <div className="feature-code">
                  <span>{feature.index}</span>
                  <small>{feature.label}</small>
                </div>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="instrument-section" aria-labelledby="demo-title">
          <div className="shell">
            <div className="section-index section-index-dark">
              <p>02 / Instrument</p>
              <p>Five seconds to orientation</p>
            </div>
            <div className="instrument-copy">
              <div>
                <p className="signal-label signal-label-dark">
                  <span aria-hidden="true" />
                  Live view
                </p>
                <h2 id="demo-title">
                  Open. Read.
                  <br />
                  Keep moving.
                </h2>
              </div>
              <p>
                The tightest constraint is always first. Provider traces, resets and projected spend
                stay close enough to check without breaking your flow.
              </p>
            </div>
            <div className="demo-window">
              <div className="demo-window-bar">
                <span>DEMO / 00:05</span>
                <span>LIGHT + DARK</span>
              </div>
              <video
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                poster="/media/overcap-dashboard.png"
                aria-label="A short tour of the Overcap desktop app"
              >
                <source src="/media/overcap-demo.webm" type="video/webm" />
                <source src="/media/overcap-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </section>

        <section className="section shell" id="providers" aria-labelledby="providers-title">
          <div className="section-index">
            <p>03 / Inputs</p>
            <p>One panel, twelve sources</p>
          </div>
          <div className="section-heading">
            <h2 id="providers-title">
              Your tools.
              <br />
              One live signal.
            </h2>
            <p>
              Connect only what you use. Overcap keeps each provider&apos;s own limits intact, then
              surfaces the constraint asking for attention.
            </p>
          </div>
          <ol className="provider-list" aria-label="Supported providers">
            {providers.map((provider, index) => (
              <li key={provider}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{provider}</strong>
                <i aria-hidden="true">●</i>
              </li>
            ))}
          </ol>
        </section>

        <section className="privacy-section" aria-labelledby="privacy-title">
          <div className="shell privacy-grid">
            <div>
              <p className="signal-label">
                <span aria-hidden="true" />
                Local by default
              </p>
              <h2 id="privacy-title">Your usage never becomes our product.</h2>
            </div>
            <div className="privacy-points">
              <p>
                <span>01</span>
                <strong>No Overcap account.</strong> Open it and connect your tools.
              </p>
              <p>
                <span>02</span>
                <strong>No analytics or telemetry.</strong> Nothing watches you use it.
              </p>
              <p>
                <span>03</span>
                <strong>Credentials stay local.</strong> Keys use your system credential store.
              </p>
              <a className="text-link" href="/privacy">
                Read the privacy note <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className="section shell" id="download" aria-labelledby="download-title">
          <div className="section-index">
            <p>04 / Install</p>
            <p>Public beta / 0.1.1</p>
          </div>
          <div className="section-heading">
            <h2 id="download-title">
              Pick a machine.
              <br />
              Start reading.
            </h2>
            <p>
              Free, MIT licensed and built in public. Choose the current installer for your
              platform; updates are verified in the app.
            </p>
          </div>
          <DownloadGrid compact />
          <p className="beta-note">
            Current Windows and macOS installers are unsigned beta builds, so your system may ask
            for one extra confirmation. <a href="/download">Read the exact install steps.</a>
          </p>
        </section>

        <section className="project-band" aria-labelledby="project-title">
          <div className="shell project-grid">
            <div className="project-number" aria-hidden="true">
              OS—01
            </div>
            <div>
              <p className="signal-label signal-label-dark">
                <span aria-hidden="true" />
                Open system
              </p>
              <h2 id="project-title">Built where you can inspect it.</h2>
              <p>
                Overcap is free software under the MIT License. Read the code, report an issue or
                shape what comes next.
              </p>
              <div className="project-actions">
                <a className="button button-inverse" href="https://github.com/AJ-Base44/overcap">
                  Open GitHub
                </a>
                <a
                  className="text-link text-link-dark"
                  href="https://github.com/AJ-Base44/overcap#credits"
                >
                  Read project credits <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="final-cta shell" aria-labelledby="final-title">
          <p className="signal-label">
            <span aria-hidden="true" />
            Local system / Ready
          </p>
          <h2 id="final-title">
            One glance
            <br />
            before the cap.
          </h2>
          <p>Live quota telemetry for Windows, macOS and Linux.</p>
          <a className="button" href={releaseUrl}>
            Download Overcap
          </a>
        </section>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
