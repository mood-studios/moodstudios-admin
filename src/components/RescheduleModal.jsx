import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { bookingApi } from '../api';
import { formatDate } from '../utils/format';

function toDateInputValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bookingDurationMinutes(services) {
  const total = (services || []).reduce((sum, s) => sum + (s.duration || 60), 0);
  return Math.max(total, 60);
}

export default function RescheduleModal({ booking, onClose, onSaved }) {
  const { confirmSave } = useAdminConfirm();
  const [date, setDate] = useState(() => toDateInputValue(booking.bookingDate));
  const [selectedTime, setSelectedTime] = useState(booking.bookingTime || '');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const duration = bookingDurationMinutes(booking.services);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setError('');
    bookingApi
      .getAvailability(date, duration, booking._id)
      .then((res) => {
        const available = (res.data?.slots || []).filter((s) => s.available);
        setSlots(available);
        if (available.length && !available.some((s) => s.time === selectedTime)) {
          setSelectedTime('');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [date, booking._id, duration]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTime) {
      setError('Please select an available time slot');
      return;
    }

    const ok = await confirmSave(
      `Reschedule ${booking.userId?.name || 'this booking'} to ${date} at ${selectedTime}?`,
      'Reschedule booking'
    );
    if (!ok) return;

    setSaving(true);
    setError('');
    try {
      const isoDate = new Date(`${date}T12:00:00`).toISOString();
      await bookingApi.reschedule(booking._id, isoDate, selectedTime);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Reschedule booking" onClose={onClose} wide>
      <form className="form-stack" onSubmit={handleSubmit}>
        <p className="muted reschedule-current">
          <strong>{booking.userId?.name}</strong> ·{' '}
          {(booking.services || []).map((s) => s.name).join(', ')}
          <br />
          Current: {formatDate(booking.bookingDate)} at {booking.bookingTime}
        </p>

        <label>
          New date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <fieldset className="slot-picker">
          <legend>Available times ({duration} min session)</legend>
          {loadingSlots ? (
            <p className="muted">Loading slots…</p>
          ) : slots.length === 0 ? (
            <p className="muted">No available slots on this date. Try another day.</p>
          ) : (
            <div className="slot-picker__grid">
              {slots.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  className={`slot-picker__btn${selectedTime === slot.time ? ' slot-picker__btn--active' : ''}`}
                  onClick={() => setSelectedTime(slot.time)}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        {error && <p className="form-error">{error}</p>}

        <footer className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving || !selectedTime}>
            {saving ? 'Saving…' : 'Save new schedule'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
