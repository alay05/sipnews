import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { createApiClient } from "@/lib/apiClient";

export default async function AppHomePage() {
  const { getToken } = await auth();
  const api = createApiClient({ authToken: await getToken() });
  const digests = await api.getDigestHistory();
  const settings = await api.getSettings();

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Digest workspace</h1>
          <p className="muted">
            Review delivery readiness and jump into the next setup task.
          </p>
        </div>
        <div className="page-actions">
          <Link className="button secondary" href="/app/settings">
            Settings
          </Link>
          <Link className="button" href="/app/onboarding">
            Continue setup
          </Link>
        </div>
      </header>

      <section className="dashboard-grid" aria-label="Digest status">
        <div className="stat panel">
          <span className="muted">Recent digests</span>
          <strong>{digests.length}</strong>
        </div>
        <div className="stat panel">
          <span className="muted">Delivery hour</span>
          <strong>{settings.deliveryHourLocal}:00</strong>
        </div>
        <div className="stat panel">
          <span className="muted">Topics</span>
          <strong>{settings.topics.length}</strong>
        </div>
      </section>

      <section className="empty-state">
        <h2>Backend integration placeholder</h2>
        <p className="muted">
          The web shell reads typed placeholder data until the Express API
          exposes authenticated account, settings, and digest endpoints.
        </p>
      </section>
    </>
  );
}
