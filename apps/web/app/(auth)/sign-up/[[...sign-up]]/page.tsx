import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";

export default function SignUpPage() {
  return (
    <main className="page-shell auth-page">
      <section className="auth-copy">
        <div>
          <Link className="brand" href="/">
            Sip
          </Link>
          <p className="eyebrow">Email magic link setup</p>
          <h1>Create account</h1>
          <p className="muted">
            Use email-first authentication, then finish digest preferences in
            onboarding.
          </p>
          <div className="auth-links">
            <span className="muted">Already configured?</span>
            <Link className="button secondary" href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>
        <div className="auth-cutout">
          <div className="cutout-card" aria-hidden="true" />
        </div>
      </section>

      <section className="auth-card panel">
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
