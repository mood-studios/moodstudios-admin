import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import PasswordField from '../components/PasswordField';
import Modal from '../components/Modal';
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

const emptyCreateForm = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
});

export default function Users() {
  const { confirmDelete, confirmSave } = useAdminConfirm();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { searchInput, setSearchInput, search } = useDebouncedSearch();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', role: 'customer' });
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    userApi
      .getAll({ role: roleFilter, search, page, limit: 15 })
      .then((res) => {
        setUsers(res.data || []);
        setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [roleFilter, search, page]);

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
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;

    const ok = await confirmSave(
      `Save changes for ${editing.name} (${editing.email})?`,
      'Update user'
    );
    if (!ok) return;

    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name, phone: form.phone, role: form.role };
      if (form.role === 'customer') {
        payload.isVerified = true;
      }
      await userApi.update(editing._id, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    const ok = await confirmSave(
      `Create customer account for ${createForm.name} (${createForm.email})?`,
      'Create customer'
    );
    if (!ok) return;

    setSaving(true);
    setError('');
    try {
      await userApi.createCustomer(createForm);
      setCreating(false);
      setCreateForm(emptyCreateForm());
      setRoleFilter('customer');
      setPage(1);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const ok = await confirmDelete(
      `Delete ${user.name} (${user.email})? This cannot be undone.`,
      'Delete user'
    );
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
      <PageHeader
        title="User management"
        subtitle="View and manage all accounts"
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>
            Create customer
          </button>
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
          <p className="muted panel__empty">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="muted panel__empty">
            {search || roleFilter ? 'No users match your search or filters.' : 'No users found.'}
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

      {creating && (
        <Modal title="Create customer account" onClose={() => setCreating(false)}>
          <form className="form-stack" onSubmit={handleCreate}>
            <p className="muted" style={{ margin: 0 }}>
              Customer accounts are created as email-verified. Share the password securely with the
              client.
            </p>
            <label>
              Full name
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                autoComplete="off"
              />
            </label>
            <label>
              Phone
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </label>
            <PasswordField
              label="Password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <footer className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setCreating(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create account'}
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {editing && (
        <Modal title="Edit user" onClose={() => setEditing(null)}>
          <form className="form-stack" onSubmit={handleSave}>
            <p className="muted" style={{ margin: 0 }}>
              {editing.email}
              {editing.role === 'customer' ? ' · Verified customer' : ''}
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
