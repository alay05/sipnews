import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton
} from "@clerk/nextjs";
import Link from "next/link";

const inboxEditions = [
  {
    time: "7:00 AM",
    subject: "Microsoft puts Copilot at the center of Windows",
    preview: "Plus: space tourism, box office surprises, and more inside."
  },
  {
    time: "Yesterday",
    subject: "The NBA's young stars are reshaping the playoff picture",
    preview: "Plus: Formula 1, the WNBA, and more inside."
  },
  {
    time: "Monday",
    subject: "Ford shifts its EV plans toward smaller, lower-cost models",
    preview: "Plus: air taxis, new rail routes, and more inside."
  }
];

const steps = [
  {
    number: "01",
    title: "Pick your mix",
    body: "Choose your topics and story counts."
  },
  {
    number: "02",
    title: "Set your morning",
    body: "Set your delivery time and summary length."
  },
  {
    number: "03",
    title: "Read one edition",
    body: "Get one concise digest in your inbox."
  }
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="page-shell landing-header">
        <Link className="brand landing-brand" href="/">
          Sipnews
        </Link>
        <span className="paper-meta">A daily edition shaped around you</span>
        <nav className="landing-nav" aria-label="Primary">
          <SignedOut>
            <>
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
            </>
          </SignedOut>
          <SignedIn>
            <Link className="button" href="/app" prefetch={false}>
              Open my digest
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </header>

      <section className="page-shell landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">A calmer way to keep up</p>
          <h1>Your news.<br />One good read.</h1>
          <p className="landing-lede">
            Pick your topics and get one concise daily digest, without the
            endless feed.
          </p>
          <div className="hero-actions">
            <SignedOut>
              <>
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
              </>
            </SignedOut>
            <SignedIn>
              <Link className="button secondary" href="/app/digests">
                Read past editions
              </Link>
            </SignedIn>
          </div>
          <div className="edition-facts" aria-label="Digest highlights">
            <span>Selected topics</span>
            <span>Short summaries</span>
            <span>Daily delivery</span>
          </div>
        </div>

        <div className="digest-showcase" aria-label="Sipnews emails on a phone">
          <div className="phone-frame">
            <div className="phone-speaker" aria-hidden="true" />
            <div className="phone-screen">
              <div className="phone-inbox-header">
                <span>Inbox</span>
                <span>3 unread</span>
              </div>
              <div className="phone-mail-label">
                <strong>Primary</strong>
                <span>Morning delivery</span>
              </div>
              <ol className="phone-mail-list">
                {inboxEditions.map((edition, index) => (
                  <li key={edition.subject} className={index === 0 ? "is-unread" : undefined}>
                    <span className="mail-unread-dot" aria-hidden="true" />
                    <div className="mail-copy">
                      <div>
                        <strong>Sipnews</strong>
                        <span>{edition.time}</span>
                      </div>
                      <h3>{edition.subject}</h3>
                      <p>{edition.preview}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="phone-compose" aria-hidden="true">+</div>
            </div>
          </div>
        </div>
      </section>

      <section className="process-section" id="how-it-works">
        <div className="page-shell process-inner">
          <div className="section-heading">
            <p className="eyebrow">How Sipnews works</p>
            <h2>From your interests to your inbox.</h2>
            <p className="muted">
              Set it once, then start each day with a focused edition.
            </p>
          </div>
          <ol className="process-grid">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="step-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="page-shell landing-footer">
        <Link className="brand landing-brand" href="/">
          Sipnews
        </Link>
        <p>Your news, once a day.</p>
        <SignedOut>
          <SignUpButton mode="redirect">
            <button className="text-button" type="button">Create account</button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <Link className="text-button" href="/app">Open my digest</Link>
        </SignedIn>
      </footer>
    </main>
  );
}
