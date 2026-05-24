import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SearchField from '../components/SearchField';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { userApi } from '../api';
import { formatDateTime } from '../utils/format';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'customer', label: 'Customers' },
];

export default function ArchivedUsers() {
  const { confirmSave } = useAdminConfirm();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { searchInput, setSearchInput, search } = useDebouncedSearch();
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    userApi
      .getAll({
        role: roleFilter,
        search,
        page,
        limit: 15,
        archived: 'true',
      })
      .then((res) => {
        setUsers(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roleFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleRestore = async (user) => {
    const ok = await confirmSave(
      `Restore ${user.name} (${user.email})? They will appear in Users again and can sign in.`,
      'Restore account'
    );
    if (!ok) return;
    setError('');
    try {
      await userApi.restore(user._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Archived accounts"
        subtitle="Deleted users are kept here. Restore to re-enable access."
        actions={
          <Link to="/users" className="btn btn--ghost">
            Back to users
          </Link>
        }
      />

      <section className="toolbar">
        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Name, email, or phone…"
        />
        <label>
          Role
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        {loading ? (
          <p className="muted panel__empty">Loading archived accounts…</p>
        ) : users.length === 0 ? (
          <p className="muted panel__empty">
            {search || roleFilter
              ? 'No archived accounts match your search or filters.'
              : 'No archived accounts yet.'}
          </p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Archived</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge badge--${u.role === 'admin' ? 'completed' : 'pending'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{formatDateTime(u.createdAt)}</td>
                    <td>{u.archivedAt ? formatDateTime(u.archivedAt) : '—'}</td>
                    <td className="table-actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleRestore(u)}
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className="pagination">
              <span className="muted">
                {pagination.total} archived account{pagination.total !== 1 ? 's' : ''}
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
