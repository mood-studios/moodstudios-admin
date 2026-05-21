import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import CloseIcon from '../components/CloseIcon';
import { bookingApi, galleryApi } from '../api';
import { formatDate } from '../utils/format';
import { useDialog } from '../context/DialogContext';

export default function Gallery() {
  const { confirm } = useDialog();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState('');
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [error, setError] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [uploadAlbumId, setUploadAlbumId] = useState(null);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    bookingApi
      .getAll()
      .then((res) => {
        const list = (res.data || []).filter(
          (b) =>
            (b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed') &&
            b.paymentStatus === 'paid'
        );
        setBookings(list);
        if (list.length) setSelectedBooking(list[0]._id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBooking) {
      setAlbums([]);
      return;
    }
    setAlbumLoading(true);
    galleryApi
      .getByBooking(selectedBooking)
      .then((res) => setAlbums(res.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setAlbumLoading(false));
  }, [selectedBooking]);

  const createAlbum = async (e) => {
    e.preventDefault();
    try {
      await galleryApi.createAlbum(selectedBooking, albumName);
      setAlbumName('');
      setShowCreate(false);
      const res = await galleryApi.getByBooking(selectedBooking);
      setAlbums(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!files.length) return;
    try {
      await galleryApi.uploadPhotos(uploadAlbumId, Array.from(files));
      setFiles([]);
      setUploadAlbumId(null);
      const res = await galleryApi.getByBooking(selectedBooking);
      setAlbums(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAlbum = async (albumId, albumName) => {
    const ok = await confirm({
      title: 'Delete album',
      message: `Delete "${albumName}" and all its photos? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await galleryApi.deleteAlbum(albumId);
      const res = await galleryApi.getByBooking(selectedBooking);
      setAlbums(res.data || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const downloadAlbum = async (albumId, albumName) => {
    try {
      await galleryApi.downloadAlbum(albumId, albumName);
    } catch (e) {
      setError(e.message);
    }
  };

  const deletePhoto = async (albumId, photoId) => {
    const ok = await confirm({
      title: 'Remove photo',
      message: 'Remove this photo?',
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await galleryApi.deletePhoto(albumId, photoId);
      const res = await galleryApi.getByBooking(selectedBooking);
      setAlbums(res.data || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const selected = bookings.find((b) => b._id === selectedBooking);

  return (
    <>
      <PageHeader
        title="Gallery"
        subtitle="Upload client photos for completed sessions"
        actions={
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selectedBooking}
            onClick={() => setShowCreate(true)}
          >
            New album
          </button>
        }
      />

      {error && <p className="form-error">{error}</p>}

      <section className="toolbar">
        <label>
          Completed booking
          <select value={selectedBooking} onChange={(e) => setSelectedBooking(e.target.value)}>
            {bookings.map((b) => (
              <option key={b._id} value={b._id}>
                {b.userId?.name} — {formatDate(b.bookingDate)} ({b.bookingTime})
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading ? (
        <p className="muted">Loading bookings…</p>
      ) : bookings.length === 0 ? (
        <p className="muted panel__empty">
          No confirmed, paid bookings yet. Confirm bookings and complete payment first.
        </p>
      ) : (
        <section className="gallery-layout">
          {selected && (
            <p className="muted">
              Client: <strong>{selected.userId?.name}</strong> ·{' '}
              {(selected.services || []).map((s) => s.name).join(', ')}
            </p>
          )}

          {albumLoading ? (
            <p className="muted">Loading albums…</p>
          ) : albums.length === 0 ? (
            <p className="muted panel__empty">No albums for this booking.</p>
          ) : (
            albums.map((album) => (
              <article key={album._id} className="album-card">
                <header className="album-card__head">
                  <h3>{album.albumName}</h3>
                  <div className="album-card__actions">
                    {(album.photos || []).length > 0 ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => downloadAlbum(album._id, album.albumName)}
                      >
                        Download
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setUploadAlbumId(album._id)}
                    >
                      Upload photos
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => deleteAlbum(album._id, album.albumName)}
                    >
                      Delete album
                    </button>
                  </div>
                </header>
                <section className="photo-grid">
                  {(album.photos || []).map((photo) => (
                    <figure key={photo._id} className="photo-thumb">
                      <img src={photo.url} alt={photo.caption || ''} />
                      <button
                        type="button"
                        className="photo-thumb__delete"
                        onClick={() => deletePhoto(album._id, photo._id)}
                        aria-label="Delete photo"
                      >
                        <CloseIcon size={14} />
                      </button>
                    </figure>
                  ))}
                </section>
              </article>
            ))
          )}
        </section>
      )}

      {showCreate && (
        <Modal title="Create album" onClose={() => setShowCreate(false)}>
          <form className="form-stack" onSubmit={createAlbum}>
            <label>
              Album name
              <input value={albumName} onChange={(e) => setAlbumName(e.target.value)} required />
            </label>
            <footer className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Create
              </button>
            </footer>
          </form>
        </Modal>
      )}

      {uploadAlbumId && (
        <Modal title="Upload photos" onClose={() => setUploadAlbumId(null)}>
          <form className="form-stack" onSubmit={upload}>
            <label>
              Images (max 20)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                required
              />
            </label>
            <footer className="form-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setUploadAlbumId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Upload
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
