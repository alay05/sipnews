import { summaryLengths } from "@sipnews/contracts";
import { saveSettingsAction } from "../actions";
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
          <h1>Account settings</h1>
          <p className="muted">
            Update the same delivery, category, and summary preferences the worker uses for every user.
          </p>
        </div>
      </header>

      <form action={saveSettingsAction} className="form-grid">
        <section className="form-section">
          <h2>Account</h2>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={settings.email ?? ""} readOnly disabled />
          </div>
          <div className="field">
            <label htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              name="displayName"
              defaultValue={settings.displayName ?? ""}
              placeholder="Your name"
            />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="isActive" defaultChecked={settings.isActive} />
            <span>Receive future digests</span>
          </label>
        </section>

        <section className="form-section">
          <h2>Schedule</h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="timezone">Timezone</label>
              <input id="timezone" name="timezone" defaultValue={settings.timezone} />
            </div>
            <div className="field">
              <label htmlFor="sendHour">Local delivery hour</label>
              <select id="sendHour" name="sendHour" defaultValue={String(settings.sendHour)}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {hour.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Digest preferences</h2>
          <div className="field">
            <label htmlFor="digestMaxItems">Stories per digest</label>
            <input
              id="digestMaxItems"
              name="digestMaxItems"
              type="number"
              min={1}
              max={25}
              defaultValue={settings.digestMaxItems}
            />
          </div>
          <div className="field">
            <span>Category counts</span>
            <div className="field-grid">
              <CountInput label="World" name="countWorld" value={settings.categoryCounts.world} />
              <CountInput label="Tech" name="countTech" value={settings.categoryCounts.tech} />
              <CountInput label="AI" name="countAi" value={settings.categoryCounts.ai} />
              <CountInput label="Startups" name="countStartups" value={settings.categoryCounts.startups} />
            </div>
          </div>
          <div className="field">
            <span>Summary length</span>
            <div className="checkbox-grid">
              {summaryLengths.map((length) => (
                <label key={length} className="checkbox-row">
                  <input
                    type="radio"
                    name="summaryLength"
                    value={length}
                    defaultChecked={settings.summaryLength === length}
                  />
                  <span>{labelForSummaryLength(length)}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <div className="page-actions">
          <button className="button" type="submit">
            Save settings
          </button>
        </div>
      </form>
    </>
  );
}

function labelForSummaryLength(length: string): string {
  return length.charAt(0).toUpperCase() + length.slice(1);
}

function CountInput(props: { label: string; name: string; value: number }) {
  return (
    <div className="field">
      <label htmlFor={props.name}>{props.label}</label>
      <input
        id={props.name}
        name={props.name}
        type="number"
        min={0}
        max={25}
        defaultValue={props.value}
      />
    </div>
  );
}
