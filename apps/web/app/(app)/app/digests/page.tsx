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

      <ol className="history-list">
        {digests.map((digest) => (
          <li className="history-item" key={digest.id}>
            <div>
              <h2>{digest.title}</h2>
              <p className="muted">
                {digest.deliveredAt
                  ? new Date(digest.deliveredAt).toLocaleString()
                  : "Not delivered yet"}
              </p>
            </div>
            <div>
              <span className="status-pill">
                {digest.deliveredAt ? "Delivered" : "Pending"}
              </span>
              <p className="muted">{digest.itemCount} stories</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
