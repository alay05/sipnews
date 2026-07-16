import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";

export default function SignInPage() {
  return (
    <main className="page-shell auth-page member-auth-page">
      <section className="auth-copy member-auth-copy">
        <div>
          <Link className="brand landing-brand" href="/">
            Sipnews
          </Link>
          <h1>Sign in</h1>
          <p className="auth-lede">
            Continue with the email address connected to your digest.
          </p>
          <div className="beta-notice">
            <strong>Private beta testing</strong>
            <span>New accounts are currently limited to approved testers.</span>
          </div>
          <div className="auth-links">
            <span>New here?</span>
            <Link className="button secondary" href="/sign-up">
              Create account
            </Link>
          </div>
          <Link className="back-home-link" href="/">
            <span aria-hidden="true">&larr;</span> Back to the front page
          </Link>
        </div>
      </section>

      <section className="auth-card member-auth-card">
        {hasClerkPublishableKey() ? (
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/app"
            appearance={{
              elements: {
                cardBox: "clerk-card-box",
                footer: "clerk-footer"
              }
            }}
          />
        ) : (
          <p className="muted">Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign in.</p>
        )}
      </section>
    </main>
  );
}
