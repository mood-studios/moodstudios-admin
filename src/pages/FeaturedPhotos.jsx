import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { featuredPhotoApi, serviceApi } from '../api';

const MAX_PHOTOS = 12;

function mapPhoto(doc) {
  return {
    _id: doc._id,
    url: doc.url,
    isVisible: doc.isVisible !== false,
  };
}

export default function FeaturedPhotos() {
  const { confirmDelete, confirmSave, confirmUpdate, confirmUpload } = useAdminConfirm();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const heroIndex = photos.findIndex((p) => p.isVisible);

  const load = useCallback(() => {
    setLoading(true);
    featuredPhotoApi
      .list()
      .then((res) => setPhotos((res.data || []).map(mapPhoto)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFiles = async (files) => {
    const imageFiles = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      setError(`You can add up to ${MAX_PHOTOS} featured photos.`);
      return;
    }

    const toUpload = imageFiles.slice(0, remaining);
    setUploading(true);
    setError('');
    setSaved(false);

    try {
      const uploadRes =
        toUpload.length === 1
          ? await serviceApi.uploadImage(toUpload[0])
          : await serviceApi.uploadImages(toUpload);
      const urls =
        uploadRes.data.urls || (uploadRes.data.url ? [uploadRes.data.url] : []);

      setPhotos((prev) => {
        const merged = [...prev];
        urls.forEach((url) => {
          if (url && !merged.some((p) => p.url === url)) {
            merged.push({ url, isVisible: true });
          }
        });
        return merged.slice(0, MAX_PHOTOS);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (index) => {
    const ok = await confirmDelete(
      'Remove this photo from the featured list? Click Save to website to publish this change.',
      'Remove photo'
    );
    if (!ok) return;
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const movePhoto = async (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= photos.length) return;
    const label = direction < 0 ? 'move this photo earlier' : 'move this photo later';
    const ok = await confirmUpdate(`Reorder featured photos: ${label}?`);
    if (!ok) return;
    setPhotos((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
    setSaved(false);
  };

  const toggleVisible = async (index) => {
    const photo = photos[index];
    if (!photo) return;

    const nextVisible = !photo.isVisible;
    const ok = await confirmUpdate(
      nextVisible
        ? 'Show this photo on the landing page gallery?'
        : 'Hide this photo from the landing page? (It stays in your list until you remove it.)',
      nextVisible ? 'Show on website' : 'Hide from website'
    );
    if (!ok) return;

    setSaved(false);
    setError('');

    if (photo._id) {
      try {
        const res = await featuredPhotoApi.toggleVisibility(photo._id);
        const updated = mapPhoto(res.data);
        setPhotos((prev) => prev.map((p, i) => (i === index ? updated : p)));
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, isVisible: !p.isVisible } : p))
    );
  };

  const handleSave = async () => {
    const ok = await confirmSave(
      `Publish ${photos.length} featured photo(s) to the landing page?`,
      'Save to website'
    );
    if (!ok) return;

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await featuredPhotoApi.save(
        photos.map((p) => ({ url: p.url, isVisible: p.isVisible }))
      );
      setSaved(true);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Featured photos"
        subtitle="Photos shown on the landing page hero gallery (first visible photo is the main hero image)"
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Saving…' : 'Save to website'}
          </button>
        }
      />

      {error && <p className="form-error">{error}</p>}
      {saved && (
        <p className="featured-photos-saved">Featured photos saved. Refresh the landing page to see changes.</p>
      )}

      <section className="panel">
        <p className="muted" style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>
          Upload up to {MAX_PHOTOS} images. Use the visibility switch to hide photos without deleting them. Reorder with
          the arrows — the first <strong>visible</strong> photo is the hero.
        </p>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {photos.length > 0 && (
              <div className="featured-photos-grid">
                {photos.map((photo, index) => (
                  <article
                    key={photo._id || `${photo.url}-${index}`}
                    className={`featured-photo-card${photo.isVisible ? '' : ' featured-photo-card--hidden'}`}
                  >
                    <div className="featured-photo-card__media">
                      {heroIndex === index && (
                        <span className="featured-photo-card__badge">Hero</span>
                      )}
                      <img src={photo.url} alt="" />
                    </div>
                    <div className="featured-photo-card__options">
                      <label
                        className="visibility-switch"
                        title={photo.isVisible ? 'Visible on site' : 'Hidden from site'}
                      >
                        <input
                          type="checkbox"
                          checked={photo.isVisible}
                          onChange={() => toggleVisible(index)}
                        />
                        <span className="visibility-switch__track" aria-hidden="true" />
                        <span className="visibility-switch__label">
                          {photo.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                      </label>
                      <div className="featured-photo-card__controls">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0}
                          aria-label="Move earlier"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === photos.length - 1}
                          aria-label="Move later"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm featured-photo-card__remove"
                          onClick={() => removePhoto(index)}
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <label className="btn btn--ghost btn--sm sample-photos-add" style={{ marginTop: '1rem' }}>
              {uploading ? 'Uploading…' : 'Add featured photos'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                hidden
                disabled={uploading || saving || photos.length >= MAX_PHOTOS}
                onChange={async (e) => {
                  const fileList = e.target.files;
                  e.target.value = '';
                  if (!fileList?.length) return;

                  const imageFiles = [...fileList].filter((f) => f.type.startsWith('image/'));
                  if (!imageFiles.length) return;

                  const remaining = MAX_PHOTOS - photos.length;
                  if (remaining <= 0) {
                    setError(`You can add up to ${MAX_PHOTOS} featured photos.`);
                    return;
                  }

                  const count = Math.min(imageFiles.length, remaining);
                  const ok = await confirmUpload(
                    `Add ${count} photo${count === 1 ? '' : 's'} to the featured list? Click Save to website when you are done.`,
                    'Add featured photos'
                  );
                  if (!ok) return;

                  await uploadFiles(imageFiles);
                }}
              />
            </label>
          </>
        )}
      </section>
    </>
  );
}
