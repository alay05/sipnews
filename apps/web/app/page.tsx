import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main>
      <header className="page-shell landing-header">
        <Link className="brand" href="/">
          SMS News
        </Link>
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
            <Link className="button" href="/app" prefetch={false}>
              Open app
            </Link>
          </SignedIn>
        </nav>
      </header>

      <section className="page-shell hero">
        <div className="hero-copy">
          <p className="eyebrow">Private daily news briefings</p>
          <h1>SMS News</h1>
          <p>
            Configure a concise digest, review past sends, and keep noisy feeds
            out of your day.
          </p>
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
              <Link className="button" href="/app" prefetch={false}>
                Go to digest history
              </Link>
            </SignedIn>
          </div>
        </div>

        <div className="digest-preview panel" aria-label="Digest preview">
          <div className="preview-header">
            <span>Today</span>
            <strong>7 stories</strong>
          </div>
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
