import { auth } from "@clerk/nextjs/server";
import { createApiClient } from "@/lib/apiClient";

export default async function OnboardingPage() {
  const { getToken } = await auth();
  const api = createApiClient({ authToken: await getToken() });
  const onboarding = await api.getOnboarding();

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">Onboarding</p>
          <h1>Digest setup</h1>
          <p className="muted">
            Capture the preferences the API will persist for daily delivery.
          </p>
        </div>
        <span className="status-pill">
          {onboarding.hasCompletedOnboarding ? "Complete" : "Needs setup"}
        </span>
      </header>

      <form className="form-grid">
        <section className="form-section">
          <h2>Topics</h2>
          <span>Placeholder selections until saved preferences are available.</span>
          <div className="field">
            <label htmlFor="topics">Preferred coverage</label>
            <textarea
              id="topics"
              name="topics"
              defaultValue={onboarding.recommendedTopics.join(", ")}
            />
          </div>
        </section>

        <section className="form-section">
          <h2>Delivery</h2>
          <div className="field-grid">
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input
                id="phone"
                name="phone"
                placeholder="+1 555 000 0000"
                defaultValue={onboarding.settings.phoneNumber ?? ""}
              />
            </div>
            <div className="field">
              <label htmlFor="hour">Local delivery hour</label>
              <select
                id="hour"
                name="hour"
                defaultValue={String(onboarding.settings.deliveryHourLocal)}
              >
                {Array.from({ length: 15 }, (_, index) => index + 6).map(
                  (hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </section>

        <div className="page-actions">
          <button className="button" type="button" disabled>
            Save when API is ready
          </button>
        </div>
      </form>
    </>
  );
}
