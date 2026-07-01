import { createApiClient } from "@/lib/apiClient";
import { getOptionalAuthToken } from "@/lib/authToken";

export default async function SettingsPage() {
  const api = createApiClient({ authToken: await getOptionalAuthToken() });
  const settings = await api.getSettings();

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Delivery settings</h1>
          <p className="muted">
            Account-level preferences are shown as typed placeholders for now.
          </p>
        </div>
      </header>

      <section className="form-grid">
        <div className="setting-row">
          <div>
            <h2>Phone</h2>
            <p className="muted">SMS destination for concise briefs.</p>
          </div>
          <strong>{settings.phoneNumber ?? "Not connected"}</strong>
        </div>
        <div className="setting-row">
          <div>
            <h2>Email</h2>
            <p className="muted">Fallback address for account access.</p>
          </div>
          <strong>{settings.email ?? "Managed by Clerk"}</strong>
        </div>
        <div className="setting-row">
          <div>
            <h2>Schedule</h2>
            <p className="muted">{settings.timezone}</p>
          </div>
          <strong>{settings.deliveryHourLocal}:00</strong>
        </div>
      </section>
    </>
  );
}
