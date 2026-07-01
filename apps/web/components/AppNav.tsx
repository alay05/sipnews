import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";

export function AppNav() {
  return (
    <header className="app-topbar">
      <Link className="brand" href="/app" prefetch={false}>
        Sip
      </Link>
      <nav className="app-nav" aria-label="Application">
        <Link href="/app/digests" prefetch={false}>
          Digests
        </Link>
        <Link href="/app/onboarding" prefetch={false}>
          Onboarding
        </Link>
        <Link href="/app/settings" prefetch={false}>
          Settings
        </Link>
        {hasClerkPublishableKey() ? (
          <UserButton afterSignOutUrl="/" />
        ) : (
          <span className="status-pill">Local</span>
        )}
      </nav>
    </header>
  );
}
