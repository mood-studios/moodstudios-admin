import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SearchField from '../components/SearchField';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useDialog } from '../context/DialogContext';
import { userApi } from '../api';
import { formatDateTime } from '../utils/format';

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'customer', label: 'Customers' },
];

const VERIFIED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Verified' },
  { value: 'false', label: 'Not verified' },
];

export default function Users() {
  const { confirm } = useDialog();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const { searchInput, setSearchInput, search } = useDebouncedSearch();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', role: 'customer', isVerified: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    userApi
      .getAll({ role: roleFilter, isVerified: verifiedFilter, search, page, limit: 15 })
      .then((res) => {
        setUsers(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roleFilter, verifiedFilter, search, page]);

  useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'admin' || role === 'customer') setRoleFilter(role);
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openEdit = (user) => {
    setEditing(user);
    setForm({
      name: user.name,
      phone: user.phone || '',
      role: user.role,
      isVerified: Boolean(user.isVerified),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      await userApi.update(editing._id, form);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const ok = await confirm({
      title: 'Delete user',
      message: `Delete ${user.name} (${user.email})? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setError('');
    try {
      await userApi.delete(user._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="User management" subtitle="View and manage all accounts" />

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
        <label>
          Verified
          <select
            value={verifiedFilter}
            onChange={(e) => {
              setVerifiedFilter(e.target.value);
              setPage(1);
            }}
          >
            {VERIFIED_OPTIONS.map((o) => (
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
          <p className="muted panel__empty">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="muted panel__empty">
            {search || roleFilter || verifiedFilter
              ? 'No users match your search or filters.'
              : 'No users found.'}
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
                  <th>Verified</th>
                  <th>Joined</th>
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
                    <td>{u.isVerified ? 'Yes' : 'No'}</td>
                    <td>{formatDateTime(u.createdAt)}</td>
                    <td className="table-actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(u)}>
                        Edit
                      </button>
                      {u.role === 'customer' && (
                        <Link to={`/chat?customer=${u._id}`} className="btn btn--ghost btn--sm">
                          Message
                        </Link>
                      )}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--danger"
                        onClick={() => handleDelete(u)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <footer className="pagination">
              <span className="muted">
                {pagination.total} user{pagination.total !== 1 ? 's' : ''}
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

      {editing && (
        <Modal title="Edit user" onClose={() => setEditing(null)}>
          <form className="form-stack" onSubmit={handleSave}>
            <p className="muted" style={{ margin: 0 }}>
              {editing.email}
            </p>
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.isVerified}
                onChange={(e) => setForm({ ...form, isVerified: e.target.checked })}
              />
              Email verified
            </label>
            <footer className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
