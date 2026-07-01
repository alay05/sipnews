import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";

export default function SignInPage() {
  return (
    <main className="page-shell auth-page">
      <section className="auth-copy">
        <Link className="brand" href="/">
          Sip
        </Link>
        <p className="eyebrow">Email magic link access</p>
        <h1>Sign in</h1>
        <p className="muted">
          Continue with the email address you use for digest delivery and
          settings.
        </p>
        <div className="auth-links">
          <span className="muted">New here?</span>
          <Link className="button secondary" href="/sign-up">
            Create account
          </Link>
        </div>
      </section>

      <section className="auth-card panel">
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
