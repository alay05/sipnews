import { AppNav } from "@/components/AppNav";
import type { ReactNode } from "react";

export default function ProtectedAppLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="app-shell">
      <AppNav />
      <main className="app-main">{children}</main>
    </div>
  );
}
