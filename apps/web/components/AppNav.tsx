import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export function AppNav() {
  return (
    <header className="app-topbar">
      <Link className="brand" href="/app" prefetch={false}>
        SMS News
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
        <UserButton afterSignOutUrl="/" />
      </nav>
    </header>
  );
}
