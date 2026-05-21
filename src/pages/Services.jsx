import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SearchField from '../components/SearchField';
import ImageUpload from '../components/ImageUpload';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { categoryApi, serviceApi } from '../api';
import { formatCurrency } from '../utils/format';

const emptyForm = {
  name: '',
  description: '',
  price: '',
  duration: '',
  category: '',
  image: '',
  samplePhotos: [],
};

export default function Services() {
  const { confirmDelete, confirmRemove, confirmSave, confirmUpdate, confirmUpload } =
    useAdminConfirm();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [samplePhotos, setSamplePhotos] = useState([]);
  const [uploadingSamples, setUploadingSamples] = useState(false);
  const [saving, setSaving] = useState(false);
  const { searchInput, setSearchInput, search } = useDebouncedSearch();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      serviceApi.list(search ? { search } : {}),
      categoryApi.list(),
    ])
      .then(([sRes, cRes]) => {
        setServices(sRes.data || []);
        setCategories(cRes.data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const resetImageState = (imageUrl = '') => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(imageUrl);
    setForm((f) => ({ ...f, image: imageUrl }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category: categories[0]?._id || '' });
    resetImageState('');
    setSamplePhotos([]);
    setModalOpen(true);
  };

  const openEdit = (service) => {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description || '',
      price: String(service.price),
      duration: String(service.duration),
      category: service.category?._id || service.category,
      image: service.image || '',
    });
    const existingPhotos =
      Array.isArray(service.samplePhotos) && service.samplePhotos.length > 0
        ? service.samplePhotos
        : service.image
          ? [service.image]
          : [];
    resetImageState(existingPhotos[0] || '');
    setSamplePhotos(existingPhotos);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setModalOpen(false);
    setImageFile(null);
    setImagePreview('');
    setSamplePhotos([]);
  };

  const uploadSampleFiles = async (files) => {
    if (!files.length) return;
    setUploadingSamples(true);
    setError('');
    try {
      const uploadRes =
        files.length === 1
          ? await serviceApi.uploadImage(files[0])
          : await serviceApi.uploadImages(files);
      const urls =
        uploadRes.data.urls || (uploadRes.data.url ? [uploadRes.data.url] : []);
      setSamplePhotos((prev) => {
        const merged = [...prev];
        urls.forEach((url) => {
          if (url && !merged.includes(url)) merged.push(url);
        });
        return merged;
      });
      if (urls[0]) resetImageState(urls[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingSamples(false);
    }
  };

  const handleSamplePhotosSelect = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;

    const ok = await confirmUpload(
      `Upload ${files.length} sample photo${files.length === 1 ? '' : 's'} to this package?`,
      'Upload sample photos'
    );
    if (!ok) return;

    await uploadSampleFiles(files);
  };

  const removeSamplePhoto = async (index) => {
    const ok = await confirmRemove('Remove this sample photo from the package?');
    if (!ok) return;
    setSamplePhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      const cover = next[0] || '';
      resetImageState(cover);
      return next;
    });
  };

  const handleFileSelect = async (file) => {
    const ok = await confirmUpload('Upload this image as a sample photo for the package?', 'Upload image');
    if (!ok) return;

    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    await uploadSampleFiles([file]);
  };

  const handleRemoveImage = async () => {
    const ok = await confirmRemove('Remove the cover image for this package?');
    if (!ok) return;
    resetImageState('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ok = await confirmSave(
      editing
        ? `Save changes to "${form.name}"?`
        : `Create package "${form.name}"?`,
      editing ? 'Update service' : 'Create service'
    );
    if (!ok) return;

    setError('');
    setSaving(true);

    try {
      let photos = [...samplePhotos];

      if (imageFile) {
        const uploadRes = await serviceApi.uploadImage(imageFile);
        const url = uploadRes.data.url;
        if (url && !photos.includes(url)) photos.push(url);
      }

      const imageUrl = (form.image || '').trim();
      if (imageUrl && !photos.includes(imageUrl)) {
        photos.unshift(imageUrl);
      }

      photos = [...new Set(photos.filter(Boolean))];

      const body = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        duration: Number(form.duration),
        category: form.category,
        image: photos[0] || '',
        samplePhotos: photos,
      };

      if (editing) {
        await serviceApi.update(editing._id, body);
      } else {
        await serviceApi.create(body);
      }
      closeModal();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (id) => {
    const service = services.find((s) => s._id === id);
    const nextVisible = service ? !service.isVisible : true;
    const ok = await confirmUpdate(
      nextVisible
        ? `Show "${service?.name}" on the booking site?`
        : `Hide "${service?.name}" from the booking site?`,
      nextVisible ? 'Show package' : 'Hide package'
    );
    if (!ok) return;
    try {
      await serviceApi.toggleVisibility(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmDelete('Delete this service? This cannot be undone.', 'Delete service');
    if (!ok) return;
    try {
      await serviceApi.delete(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Packages and pricing shown on the site"
        actions={
          <button type="button" className="btn btn--primary" onClick={openCreate} disabled={!categories.length}>
            Add service
          </button>
        }
      />

      {error && <p className="form-error">{error}</p>}

      <section className="toolbar">
        <SearchField
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Name, description, or category…"
        />
      </section>

      <section className="panel">
        {loading ? (
          <p className="muted panel__empty">Loading services…</p>
        ) : services.length === 0 ? (
          <p className="muted panel__empty">
            {search ? 'No services match your search.' : 'No services yet. Add a category first.'}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s._id}>
                  <td>
                    {s.image ? (
                      <img src={s.image} alt="" className="service-thumb" />
                    ) : (
                      <span className="service-thumb service-thumb--empty">—</span>
                    )}
                  </td>
                  <td>
                    <strong>{s.name}</strong>
                    {s.description && (
                      <>
                        <br />
                        <small>{s.description.slice(0, 60)}…</small>
                      </>
                    )}
                  </td>
                  <td>{s.category?.name || '—'}</td>
                  <td>{formatCurrency(s.price)}</td>
                  <td>{s.duration} min</td>
                  <td>
                    <button
                      type="button"
                      className={`badge ${s.isVisible ? 'badge--confirmed' : 'badge--declined'}`}
                      onClick={() => toggleVisibility(s._id)}
                    >
                      {s.isVisible ? 'Visible' : 'Hidden'}
                    </button>
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(s)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => handleDelete(s._id)}>
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
        <Modal title={editing ? 'Edit service' : 'New service'} onClose={closeModal} wide>
          <form className="form-stack form-stack--service" onSubmit={handleSubmit}>
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={6}
                placeholder={'• 1 hour photoshoot\n• 50–80 enhanced copies\n• …'}
              />
            </label>
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Price (PHP)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  required
                />
              </label>
            </div>
            <ImageUpload
              label="Cover image (first photo)"
              value={form.image}
              previewUrl={imagePreview || samplePhotos[0] || ''}
              onFileSelect={handleFileSelect}
              onUrlChange={(url) => {
                if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
                setImageFile(null);
                setImagePreview(url);
                setForm((f) => ({ ...f, image: url }));
                if (url) {
                  setSamplePhotos((prev) => {
                    const rest = prev.filter((u) => u !== url);
                    return [url, ...rest];
                  });
                }
              }}
              onRemove={() => {
                setSamplePhotos((prev) => {
                  const next = prev.slice(1);
                  resetImageState(next[0] || '');
                  return next;
                });
              }}
            />
            <fieldset className="sample-photos-field">
              <legend>All photo samples</legend>
              <p className="muted" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
                Upload multiple images — all are saved. 1–2 show side by side on the site; 3+ use a carousel.
              </p>
              {samplePhotos.length > 0 && (
                <div className="sample-photos-grid">
                  {samplePhotos.map((url, index) => (
                    <figure key={`${url}-${index}`} className="sample-photos-grid__item">
                      <img src={url} alt="" />
                      <button
                        type="button"
                        className="sample-photos-grid__remove"
                        onClick={() => removeSamplePhoto(index)}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </figure>
                  ))}
                </div>
              )}
              <label className="btn btn--ghost btn--sm sample-photos-add">
                {uploadingSamples ? 'Uploading…' : 'Add sample photos'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  hidden
                  disabled={uploadingSamples || saving}
                  onChange={handleSamplePhotosSelect}
                />
              </label>
            </fieldset>
            <footer className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
