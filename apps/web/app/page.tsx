import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      <header className="page-shell landing-header">
        <Link className="brand" href="/">
          Sip
        </Link>
        <span className="paper-meta">A handmade daily paper for the web</span>
        <nav className="landing-nav" aria-label="Primary">
          <SignedOut>
            <SignInButton mode="redirect">
              <button className="button secondary" type="button">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <button className="button" type="button">
                Start setup
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <>
              <Link className="button" href="/app" prefetch={false}>
                Open app
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          </SignedIn>
        </nav>
      </header>

      <section className="page-shell hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Private daily news briefings</p>
            <span className="hero-ribbon">Paper collage edition</span>
            <h1>Read a smaller, better front page.</h1>
            <p>
              Configure a concise digest, review past sends, and keep noisy feeds
              out of your day. The interface is built to feel like a hand-assembled
              morning paper rather than another bright SaaS dashboard.
            </p>
          </div>
          <div>
            <div className="hero-actions">
              <SignedOut>
                <SignUpButton mode="redirect">
                  <button className="button" type="button">
                    Create account
                  </button>
                </SignUpButton>
                <SignInButton mode="redirect">
                  <button className="button secondary" type="button">
                    Sign in
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <>
                  <Link className="button" href="/app" prefetch={false}>
                    Open workspace
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </>
              </SignedIn>
            </div>
            <div className="hero-cutout" aria-hidden="true">
              <div className="hero-cutout-art" />
              <div className="hero-stamp">Morning Edition</div>
            </div>
          </div>
        </div>

        <div className="hero-feature digest-preview panel" aria-label="Digest preview">
          <div className="preview-header">
            <span>Today’s clipped brief</span>
            <strong>7 stories</strong>
          </div>
          <div className="cutout-card" aria-hidden="true" />
          <ol>
            <li>
              <span>Local</span>
              <strong>Transit board approves route changes</strong>
            </li>
            <li>
              <span>World</span>
              <strong>Energy talks continue with new draft agreement</strong>
            </li>
            <li>
              <span>Markets</span>
              <strong>Rate outlook steadies after inflation report</strong>
            </li>
          </ol>
        </div>
      </section>

      <section className="page-shell feature-band" aria-label="Product focus">
        <div>
          <p className="eyebrow">Existing pages only</p>
          <h2>Built for setup, review, and adjustment.</h2>
          <p className="muted">
            This web shell is ready for onboarding preferences, delivery
            settings, and digest history once the API contracts are finalized.
          </p>
        </div>
        <div className="feature-grid">
          <div>
            <strong>Onboarding</strong>
            <span>Capture topics, sources, and delivery defaults.</span>
          </div>
          <div>
            <strong>Settings</strong>
            <span>Keep schedule and contact preferences in one place.</span>
          </div>
          <div>
            <strong>History</strong>
            <span>Review recent digest summaries without backend coupling.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
