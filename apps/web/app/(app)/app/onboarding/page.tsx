import { summaryLengths } from "@sipnews/contracts";
import { saveOnboardingAction } from "../actions";
import { createApiClient } from "@/lib/apiClient";
import { getOptionalAuthToken } from "@/lib/authToken";

export default async function OnboardingPage() {
  const api = createApiClient({ authToken: await getOptionalAuthToken() });
  const onboarding = await api.getOnboarding();

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Digest setup</h1>
          <p className="muted">
            Configure the shared digest system using the same settings future users will use.
          </p>
        </div>
        <span className="status-pill">
          {onboarding.isComplete ? "Complete" : "Needs setup"}
        </span>
      </header>

      <form action={saveOnboardingAction} className="form-grid">
        <div className="form-grid form-grid-two">
          <section className="form-section">
            <h2>Profile</h2>
            <div className="field">
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                name="displayName"
                defaultValue={onboarding.settings.displayName ?? ""}
                placeholder="Your name"
              />
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="timezone">Timezone</label>
                <input
                  id="timezone"
                  name="timezone"
                  defaultValue={onboarding.settings.timezone}
                  placeholder="America/New_York"
                />
              </div>
              <div className="field">
                <label htmlFor="sendHour">Local delivery hour</label>
                <select id="sendHour" name="sendHour" defaultValue={String(onboarding.settings.sendHour)}>
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
            <h2>Digest mix</h2>
            <div className="field">
              <label htmlFor="digestMaxItems">Stories per digest</label>
              <input
                id="digestMaxItems"
                name="digestMaxItems"
                type="number"
                min={1}
                max={25}
                defaultValue={onboarding.settings.digestMaxItems}
              />
            </div>
            <div className="field">
              <span>Category counts</span>
              <div className="field-grid">
                <CountInput label="World" name="countWorld" value={onboarding.settings.categoryCounts.world} />
                <CountInput label="Tech" name="countTech" value={onboarding.settings.categoryCounts.tech} />
                <CountInput label="AI" name="countAi" value={onboarding.settings.categoryCounts.ai} />
                <CountInput label="Startups" name="countStartups" value={onboarding.settings.categoryCounts.startups} />
              </div>
            </div>
            <div className="field">
              <fieldset className="fieldset-reset">
                <legend>Summary length</legend>
                <div className="checkbox-grid">
                  {summaryLengths.map((length) => (
                    <label key={length} className="checkbox-row">
                      <input
                        type="radio"
                        name="summaryLength"
                        value={length}
                        defaultChecked={onboarding.settings.summaryLength === length}
                      />
                      <span>{labelForSummaryLength(length)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>
        </div>

        <div className="page-actions">
          <button className="button" type="submit">
            Save onboarding
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
