import { DownloadGrid } from "./components/DownloadGrid";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";

const releaseUrl = "https://github.com/AJ-Base44/overcap/releases/latest";

const features = [
  {
    index: "01",
    title: "The limit that matters, first",
    body: "The hero gauge scans every connected provider and surfaces your tightest live constraint before the rest.",
  },
  {
    index: "02",
    title: "See the cap coming",
    body: "Pace projections estimate whether your current burn will reach a cap before the next reset.",
  },
  {
    index: "03",
    title: "Seven days at a glance",
    body: "Compact sparklines reveal the shape of recent token usage without turning your desktop into a spreadsheet.",
  },
  {
    index: "04",
    title: "Warnings that earn the interruption",
    body: "Set 80, 95 and 100 percent alerts globally, then override them for the providers you push hardest.",
  },
  {
    index: "05",
    title: "Spend without the surprise",
    body: "Month-to-date totals pair with a simple pace projection so the end-of-month number is less mysterious.",
  },
  {
    index: "06",
    title: "Share the receipt",
    body: "Export a tidy usage receipt as a PNG, with provider nicknames, usage and spend ready to share.",
  },
];

const providers = [
  "Claude Code",
  "Codex",
  "Cursor",
  "Antigravity",
  "GitHub Copilot",
  "Devin",
  "Grok",
  "OpenCode",
  "OpenRouter",
  "Z.ai",
  "Kimi",
  "MiniMax",
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Overcap",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows 10+, macOS 11+, Linux",
  softwareVersion: "0.1.1",
  url: "https://overcap.dev",
  downloadUrl: releaseUrl,
  codeRepository: "https://github.com/AJ-Base44/overcap",
  license: "https://opensource.org/license/mit",
  author: {
    "@type": "Organization",
    name: "AIWITHAJ",
    url: "https://aiwithaj.dev",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow eyebrow-accent">Free · open source · local</p>
            <h1>
              Know your limit.
              <span>Before it knows you.</span>
            </h1>
            <p className="hero-lede">
              Track usage and limits across your AI coding tools. Overcap keeps the tightest cap,
              your pace and the reset time in one compact desktop panel.
            </p>
            <div className="hero-actions">
              <a className="button" href={releaseUrl}>
                Download Overcap
              </a>
              <a className="text-link" href="https://github.com/AJ-Base44/overcap">
                View source on GitHub <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p className="hero-meta">Windows · macOS · Linux · No account required</p>
          </div>

          <div className="product-frame product-frame-real">
            <img
              src="/media/overcap-dashboard.png"
              width="434"
              height="912"
              alt="The current Overcap dashboard with its hero gauge, spend summary, provider limits and sparklines"
            />
          </div>
        </section>

        <section className="proof-strip" aria-label="Product benefits">
          <div className="shell proof-grid">
            <p><strong>12</strong><span>providers</span></p>
            <p><strong>3</strong><span>desktop platforms</span></p>
            <p><strong>0</strong><span>tracking scripts</span></p>
            <p><strong>1</strong><span>place to look</span></p>
          </div>
        </section>

        <section className="section shell" id="features">
          <div className="section-heading">
            <p className="eyebrow">What Overcap does</p>
            <h2>Less tab-hopping.<br />More knowing.</h2>
            <p>
              The app turns usage data you already have into a fast read on what is tight, what is
              accelerating and what resets next.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.index}>
                <span>{feature.index}</span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="media-section shell" aria-labelledby="demo-heading">
          <div className="media-heading">
            <p className="eyebrow">The ten-second tour</p>
            <h2 id="demo-heading">Your limits stop hiding.</h2>
            <p>Open the panel. Find the redline. Get back to work.</p>
          </div>
          <div className="demo-window">
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
        </section>

        <section className="section providers-section shell" id="providers">
          <div className="section-heading providers-copy">
            <p className="eyebrow">Your stack, together</p>
            <h2>Twelve providers.<br />One honest read.</h2>
            <p>
              Connect the tools you use. Rename them if you like. Overcap keeps each provider’s own
              limits intact and surfaces the one asking for attention.
            </p>
          </div>
          <ul className="provider-list" aria-label="Supported providers">
            {providers.map((provider) => <li key={provider}>{provider}</li>)}
          </ul>
        </section>

        <section className="privacy-band">
          <div className="shell privacy-band-inner">
            <div>
              <p className="eyebrow eyebrow-dark">Local by default</p>
              <h2>Your usage is yours.</h2>
            </div>
            <div>
              <p>
                No Overcap account. No analytics. No telemetry. No cloud dashboard. The app reads
                usage from the services you connect and keeps its settings on your computer.
              </p>
              <a className="text-link text-link-dark" href="/privacy">
                Read the plain-English privacy note <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section className="section shell" id="download">
          <div className="section-heading download-heading">
            <p className="eyebrow">Desktop beta</p>
            <h2>Pick your machine.<br />Watch your caps.</h2>
            <p>Free, MIT licensed and built in public. Choose the installer for your platform.</p>
          </div>
          <DownloadGrid compact />
          <p className="beta-note">
            This is an early unsigned beta. Your operating system may ask for an extra confirmation.
            <a href="/download"> See platform instructions.</a>
          </p>
        </section>

        <section className="final-cta shell">
          <img src="/overcap-icon.svg" width="64" height="64" alt="" />
          <p className="eyebrow">Ready when your quota is not</p>
          <h2>Put every limit in reach.</h2>
          <p>Overcap is free, open source and ready for Windows, macOS and Linux.</p>
          <a className="button" href={releaseUrl}>Download the beta</a>
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
