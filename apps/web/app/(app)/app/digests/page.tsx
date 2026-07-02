import { createApiClient } from "@/lib/apiClient";
import { getOptionalAuthToken } from "@/lib/authToken";

export default async function DigestHistoryPage() {
  const api = createApiClient({ authToken: await getOptionalAuthToken() });
  const digests = await api.getDigestHistory();

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">History</p>
          <h1>Digest history</h1>
          <p className="muted">
            Recent worker-generated digests for this account.
          </p>
        </div>
      </header>

      <section className="history-layout">
        <ol className="history-list">
          {digests.map((digest) => (
            <li className="history-item" key={digest.id}>
              <div>
                <p className="eyebrow">Edition</p>
                <h2>{digest.title}</h2>
                <p className="muted">
                  {digest.deliveredAt
                    ? new Date(digest.deliveredAt).toLocaleString()
                    : "Not delivered yet"}
                </p>
              </div>
              <div className="history-meta">
                <span className="status-pill">
                  {digest.deliveredAt ? "Delivered" : "Pending"}
                </span>
                <p className="muted">{digest.itemCount} stories</p>
              </div>
            </li>
          ))}
        </ol>

        <aside className="paper-sidebar">
          <p className="eyebrow">Archive note</p>
          <h3>Past sends read like clipped editions.</h3>
          <p className="muted">
            This page keeps the same data and behavior, but the visual treatment now frames
            each digest like a dated artifact instead of a plain activity row.
          </p>
        </aside>
      </section>
    </>
  );
}
