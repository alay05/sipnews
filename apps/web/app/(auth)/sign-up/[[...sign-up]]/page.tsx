import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="page-shell auth-page">
      <section className="auth-copy">
        <Link className="brand" href="/">
          SMS News
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
      </section>

      <section className="auth-card panel">
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
      </section>
    </main>
  );
}
