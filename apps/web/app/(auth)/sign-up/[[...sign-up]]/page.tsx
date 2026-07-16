import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";

export default function SignUpPage() {
  return (
    <main className="page-shell auth-page member-auth-page">
      <section className="auth-copy member-auth-copy">
        <div>
          <Link className="brand landing-brand" href="/">
            Sipnews
          </Link>
          <h1>Create account</h1>
          <p className="auth-lede">
            Set up your account, then choose the topics for your daily digest.
          </p>
          <div className="beta-notice">
            <strong>Private beta testing</strong>
            <span>New accounts are currently limited to approved testers.</span>
          </div>
          <div className="auth-links">
            <span>Already have an account?</span>
            <Link className="button secondary" href="/sign-in">
              Sign in
            </Link>
          </div>
          <Link className="back-home-link" href="/">
            <span aria-hidden="true">&larr;</span> Back to the front page
          </Link>
        </div>
      </section>

      <section className="auth-card member-auth-card">
        {hasClerkPublishableKey() ? (
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/app/onboarding"
            appearance={{
              elements: {
                cardBox: "clerk-card-box",
                footer: "clerk-footer"
              }
            }}
          />
        ) : (
          <p className="muted">Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable sign up.</p>
        )}
      </section>
    </main>
  );
}
