import type { Metadata } from "next";
import { DownloadGrid } from "../components/DownloadGrid";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata: Metadata = {
  title: "Download",
  description: "Download the Overcap desktop beta for Windows, macOS or Linux.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-hero shell">
          <p className="eyebrow eyebrow-accent">Overcap 0.1.0 beta</p>
          <h1>Download once.<br />Watch every limit.</h1>
          <p>
            Choose your platform below. Every build comes from the public GitHub release, and
            Overcap checks that same release feed for signed in-app updates.
          </p>
        </header>
        <section className="inner-section shell" aria-labelledby="builds-heading">
          <h2 className="visually-hidden" id="builds-heading">Available builds</h2>
          <div className="notice">
            <strong>Beta note</strong>
            <p>
              These first builds are not signed with Apple or Microsoft developer certificates.
              Your operating system may ask for one extra confirmation before opening Overcap.
              Download only from the official release page linked here.
            </p>
          </div>
          <DownloadGrid />

          <div className="install-guide">
            <h2>Install without the guesswork</h2>
            <ol className="install-list">
              <li>
                <h3>Windows</h3>
                <ol>
                  <li>Download the installer for x64 or ARM64.</li>
                  <li>If SmartScreen appears, choose More info.</li>
                  <li>Confirm the publisher is Unknown, then choose Run anyway.</li>
                </ol>
              </li>
              <li>
                <h3>macOS</h3>
                <ol>
                  <li>Open the universal DMG and drag Overcap to Applications.</li>
                  <li>Control-click Overcap in Applications and choose Open.</li>
                  <li>Choose Open again when macOS asks for confirmation.</li>
                </ol>
              </li>
              <li>
                <h3>Linux</h3>
                <ol>
                  <li>Use the .deb on Debian-based systems, or choose the AppImage.</li>
                  <li>For AppImage, mark the file as executable.</li>
                  <li>Open Overcap from your app menu or run the AppImage directly.</li>
                </ol>
              </li>
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
