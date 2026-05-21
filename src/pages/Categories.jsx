import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SearchField from '../components/SearchField';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { categoryApi } from '../api';

export default function Categories() {
  const { confirmDelete, confirmSave } = useAdminConfirm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const { searchInput, setSearchInput, search } = useDebouncedSearch();

  const load = useCallback(() => {
    setLoading(true);
    categoryApi
      .list(search ? { search } : {})
      .then((res) => setCategories(res.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setName(cat.name);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ok = await confirmSave(
      editing ? `Save category name as "${name}"?` : `Create category "${name}"?`,
      editing ? 'Update category' : 'Create category'
    );
    if (!ok) return;

    setError('');
    try {
      if (editing) {
        await categoryApi.update(editing._id, { name });
      } else {
        await categoryApi.create({ name });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDelete(
      'Delete this category? Services using it may break.',
      'Delete category'
    );
    if (!ok) return;
    try {
      await categoryApi.delete(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Group services for the booking catalog"
        actions={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Add category
          </button>
        }
      />

      {error && <p className="form-error">{error}</p>}

      <section className="toolbar">
        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Category name…"
        />
      </section>

      <section className="panel">
        {loading ? (
          <p className="muted panel__empty">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="muted panel__empty">
            {search ? 'No categories match your search.' : 'No categories yet.'}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(c)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => handleDelete(c._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modalOpen && (
        <Modal title={editing ? 'Edit category' : 'New category'} onClose={() => setModalOpen(false)}>
          <form className="form-stack" onSubmit={handleSubmit}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <footer className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                {editing ? 'Save' : 'Create'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
