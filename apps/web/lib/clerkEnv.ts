const PLACEHOLDER_CLERK_PUBLISHABLE_KEYS = new Set(["pk_test_ci_placeholder"]);

export function hasClerkPublishableKey(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (!key) {
    return false;
  }

  return !PLACEHOLDER_CLERK_PUBLISHABLE_KEYS.has(key);
}
