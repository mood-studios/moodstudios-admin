import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { featuredPhotoApi, serviceApi } from '../api';

const MAX_PHOTOS = 12;

export default function FeaturedPhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    featuredPhotoApi
      .list()
      .then((res) => setPhotos((res.data || []).map((p) => p.url)))
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
          if (url && !merged.includes(url)) merged.push(url);
        });
        return merged.slice(0, MAX_PHOTOS);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const movePhoto = (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= photos.length) return;
    setPhotos((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await featuredPhotoApi.save(photos);
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
        subtitle="Photos shown on the landing page hero gallery (first photo is the main hero image)"
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
          Upload up to {MAX_PHOTOS} images. Drag order with the arrows — the first photo appears in the hero card and
          leads the gallery strip.
        </p>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {photos.length > 0 && (
              <div className="sample-photos-grid featured-photos-admin">
                {photos.map((url, index) => (
                  <figure key={`${url}-${index}`} className="sample-photos-grid__item">
                    {index === 0 && <span className="featured-photos-admin__badge">Hero</span>}
                    <img src={url} alt="" />
                    <div className="featured-photos-admin__actions">
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
                        className="sample-photos-grid__remove"
                        onClick={() => removePhoto(index)}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  </figure>
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
                onChange={(e) => {
                  uploadFiles(e.target.files || []);
                  e.target.value = '';
                }}
              />
            </label>
          </>
        )}
      </section>
    </>
  );
}
