import Link from "next/link";
import { createApiClient } from "@/lib/apiClient";
import { getOptionalAuthToken } from "@/lib/authToken";

export default async function AppHomePage() {
  const api = createApiClient({ authToken: await getOptionalAuthToken() });
  const digests = await api.getDigestHistory();
  const me = await api.getMe();
  const settings = await api.getSettings();

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Digest workspace</h1>
          <p className="muted">
            Review delivery readiness, your current preferences, and the latest worker output.
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
          <strong>{settings.sendHour}:00</strong>
        </div>
        <div className="stat panel">
          <span className="muted">Allocated stories</span>
          <strong>
            {Object.values(settings.categoryCounts).reduce((sum, count) => sum + count, 0)}
          </strong>
        </div>
      </section>

      <section className="empty-state">
        <h2>{me.onboardingComplete ? "Ready for the next worker run" : "Finish onboarding"}</h2>
        <p className="muted">
          {me.onboardingComplete
            ? "This account is configured through the same generalized user model future users will use."
            : "Complete onboarding to make this account eligible for worker delivery."}
        </p>
      </section>
    </>
  );
}
