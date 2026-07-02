import Link from "next/link";
import { createApiClient } from "@/lib/apiClient";
import { getOptionalAuthToken } from "@/lib/authToken";

export default async function AppHomePage() {
  const api = createApiClient({ authToken: await getOptionalAuthToken() });
  const digests = await api.getDigestHistory();
  const me = await api.getMe();
  const settings = await api.getSettings();
  const storyCount = Object.values(settings.categoryCounts).reduce(
    (sum, count) => sum + count,
    0
  );

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
          <span className="stat-label">Recent digests</span>
          <strong className="stat-value">{digests.length}</strong>
          <span className="stat-shape shape-coral" aria-hidden="true" />
        </div>
        <div className="stat panel">
          <span className="stat-label">Delivery hour</span>
          <strong className="stat-value">{settings.sendHour}:00</strong>
          <span className="stat-shape shape-gold" aria-hidden="true" />
        </div>
        <div className="stat panel">
          <span className="stat-label">Allocated stories</span>
          <strong className="stat-value">{storyCount}</strong>
          <span className="stat-shape shape-charcoal" aria-hidden="true" />
        </div>
      </section>

      <section className="summary-layout">
        <div className="empty-state">
          <h2>{me.onboardingComplete ? "Ready for the next worker run" : "Finish onboarding"}</h2>
          <p className="muted">
            {me.onboardingComplete
              ? "This account is configured through the same generalized user model future users will use."
              : "Complete onboarding to make this account eligible for worker delivery."}
          </p>
        </div>
        <aside className="paper-sidebar">
          <p className="eyebrow">Edition notes</p>
          <h3>Current mix</h3>
          <ul className="paper-points">
            <li>
              <span>Summary length</span>
              <strong>{settings.summaryLength}</strong>
            </li>
            <li>
              <span>Timezone</span>
              <strong>{settings.timezone}</strong>
            </li>
            <li>
              <span>Delivery</span>
              <strong>{settings.isActive ? "Active" : "Paused"}</strong>
            </li>
          </ul>
        </aside>
      </section>
    </>
  );
}
