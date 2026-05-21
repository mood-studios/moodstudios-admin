import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { bookingApi, serviceApi } from '../api';
import { formatCurrency } from '../utils/format';

function bookingDurationMinutes(services) {
  const total = (services || []).reduce((sum, s) => sum + (s.duration || 60), 0);
  return Math.max(total, 60);
}

export default function AdminBookModal({ customer, onClose, onSaved }) {
  const { confirmSave } = useAdminConfirm();
  const [allServices, setAllServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [date, setDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [specialRequest, setSpecialRequest] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedServices = useMemo(
    () => allServices.filter((s) => selectedIds.includes(s._id)),
    [allServices, selectedIds]
  );

  const duration = bookingDurationMinutes(selectedServices);
  const total = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);

  useEffect(() => {
    serviceApi
      .list()
      .then((res) => setAllServices((res.data || []).filter((s) => s.isVisible !== false)))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    if (!date || selectedIds.length === 0) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setError('');
    bookingApi
      .getAvailability(date, duration)
      .then((res) => {
        const available = (res.data?.slots || []).filter((s) => s.available);
        setSlots(available);
        if (!available.some((s) => s.time === selectedTime)) {
          setSelectedTime('');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [date, duration, selectedIds.length]);

  const toggleService = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIds.length) {
      setError('Select at least one service.');
      return;
    }
    if (!date || !selectedTime) {
      setError('Choose a date and available time slot.');
      return;
    }

    const ok = await confirmSave(
      `Create booking for ${customer.name} on ${date} at ${selectedTime}? Total ${formatCurrency(total)}.`,
      'Book for customer'
    );
    if (!ok) return;

    setSaving(true);
    setError('');
    try {
      await bookingApi.createForCustomer({
        userId: customer._id,
        services: selectedIds,
        bookingDate: `${date}T12:00:00.000Z`,
        bookingTime: selectedTime,
        specialRequest: specialRequest.trim() || undefined,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal title={`Book for ${customer.name}`} onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <p className="muted" style={{ margin: 0 }}>
          {customer.email}
          {customer.phone ? ` · ${customer.phone}` : ''}
        </p>

        {error && <p className="form-error">{error}</p>}

        <fieldset className="form-fieldset">
          <legend>Services</legend>
          {loadingServices ? (
            <p className="muted">Loading services…</p>
          ) : allServices.length === 0 ? (
            <p className="muted">No visible services. Add services first.</p>
          ) : (
            <ul className="check-list">
              {allServices.map((s) => (
                <li key={s._id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s._id)}
                      onChange={() => toggleService(s._id)}
                    />
                    <span>
                      {s.name} — {formatCurrency(s.price)} ({s.duration || 60} min)
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {selectedIds.length > 0 && (
          <p className="muted" style={{ margin: 0 }}>
            Estimated total: <strong>{formatCurrency(total)}</strong> · Duration: {duration} min
          </p>
        )}

        <label>
          Date
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={!selectedIds.length}
          />
        </label>

        <label>
          Time slot
          {loadingSlots ? (
            <span className="muted"> Loading slots…</span>
          ) : (
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              disabled={!date || !slots.length}
            >
              <option value="">
                {!date
                  ? 'Pick a date first'
                  : slots.length
                    ? 'Select a time'
                    : 'No slots available'}
              </option>
              {slots.map((s) => (
                <option key={s.value || s.time} value={s.time}>
                  {s.time}
                </option>
              ))}
            </select>
          )}
        </label>

        <label>
          Special request (optional)
          <textarea
            rows={3}
            value={specialRequest}
            onChange={(e) => setSpecialRequest(e.target.value)}
          />
        </label>

        <footer className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving || loadingServices}>
            {saving ? 'Booking…' : 'Create booking'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
