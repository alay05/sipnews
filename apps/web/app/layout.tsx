import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasClerkPublishableKey } from "@/lib/clerkEnv";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMS News",
  description: "A focused news digest configured for your phone and inbox."
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  if (!hasClerkPublishableKey()) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
