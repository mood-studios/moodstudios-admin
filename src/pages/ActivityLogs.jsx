import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { activityLogApi } from '../api';
import { formatActionLabel, formatDateTime } from '../utils/format';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ actions: [], resourceTypes: [] });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    activityLogApi.meta().then((res) => setMeta(res.data || { actions: [], resourceTypes: [] })).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    activityLogApi
      .list({ action: actionFilter, resourceType: resourceFilter, search, page, limit: 25 })
      .then((res) => {
        setLogs(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [actionFilter, resourceFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Activity logs"
        subtitle="Audit trail of admin actions on the platform"
      />

      <section className="toolbar">
        <label>
          Search
          <input
            type="search"
            placeholder="Summary, name, or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <label>
          Action
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {meta.actions.map((a) => (
              <option key={a} value={a}>
                {formatActionLabel(a)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Resource
          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All types</option>
            {meta.resourceTypes.filter(Boolean).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        {loading ? (
          <p className="muted panel__empty">Loading activity…</p>
        ) : logs.length === 0 ? (
          <p className="muted panel__empty">
            No activity recorded yet. Actions you take in the admin panel will appear here.
          </p>
        ) : (
          <>
            <ul className="activity-list">
              {logs.map((log) => (
                <li key={log._id} className="activity-item">
                  <div className="activity-item__time">{formatDateTime(log.createdAt)}</div>
                  <div className="activity-item__body">
                    <span className="activity-item__action">{formatActionLabel(log.action)}</span>
                    <p className="activity-item__summary">{log.summary}</p>
                    <p className="activity-item__meta">
                      {log.actorName || 'System'}
                      {log.actorEmail && ` · ${log.actorEmail}`}
                      {log.resourceType && (
                        <>
                          {' '}
                          · <span className="activity-item__tag">{log.resourceType}</span>
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="pagination">
              <span className="muted">
                {pagination.total} event{pagination.total !== 1 ? 's' : ''}
              </span>
              <span className="pagination__controls">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </span>
            </footer>
          </>
        )}
      </section>
    </>
  );
}
