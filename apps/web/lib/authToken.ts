import "server-only";

import { auth } from "@clerk/nextjs/server";
import { hasClerkPublishableKey } from "./clerkEnv";

export async function getOptionalAuthToken(): Promise<string | null> {
  if (!hasClerkPublishableKey()) {
    return null;
  }

  const { getToken } = await auth();
  return getToken();
}
