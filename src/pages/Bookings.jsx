import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import RescheduleModal from '../components/RescheduleModal';
import { bookingApi } from '../api';
import { formatCurrency, formatDate, statusClass } from '../utils/format';

const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'declined', 'completed'];
const PAYMENT_OPTIONS = ['', 'unpaid', 'pending', 'paid', 'failed', 'refunded'];
const ADMIN_ACTIONS = ['confirmed', 'declined', 'completed'];

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDateTo, setSessionDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (paymentFilter) params.paymentStatus = paymentFilter;
    if (sessionDate && sessionDateTo && sessionDate !== sessionDateTo) {
      params.dateFrom = sessionDate;
      params.dateTo = sessionDateTo;
    } else {
      const day = sessionDate || sessionDateTo;
      if (day) params.date = day;
    }

    bookingApi
      .getAll(params)
      .then((res) => setBookings(res.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter, paymentFilter, sessionDate, sessionDateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await bookingApi.updateStatus(id, status);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const clearDateFilters = () => {
    setSessionDate('');
    setSessionDateTo('');
  };

  const hasDateFilter = Boolean(sessionDate || sessionDateTo);

  return (
    <>
      <PageHeader title="Bookings" subtitle="Manage session requests and confirmations" />

      <section className="toolbar">
        <label>
          Session date
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            title="One day when end date is empty"
          />
        </label>
        <label>
          End date
          <input
            type="date"
            value={sessionDateTo}
            min={sessionDate || undefined}
            onChange={(e) => setSessionDateTo(e.target.value)}
          />
        </label>
        {hasDateFilter && (
          <button
            type="button"
            className="btn btn--ghost btn--sm toolbar-clear-dates"
            onClick={clearDateFilters}
          >
            Clear dates
          </button>
        )}
        <label>
          Booking status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s || 'All'}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="form-error">{error}</p>}

      <section className="panel">
        {loading ? (
          <p className="muted panel__empty">Loading bookings…</p>
        ) : bookings.length === 0 ? (
          <p className="muted panel__empty">
            {statusFilter || paymentFilter || hasDateFilter
              ? 'No bookings match your filters.'
              : 'No bookings yet.'}
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Services</th>
                <th>Schedule</th>
                <th>Total</th>
                <th>Booking</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <strong>{b.userId?.name}</strong>
                    <br />
                    <small>{b.userId?.email}</small>
                  </td>
                  <td>
                    {(b.services || []).map((s) => s.name).join(', ') || '—'}
                  </td>
                  <td>
                    {formatDate(b.bookingDate)}
                    <br />
                    <small>{b.bookingTime}</small>
                  </td>
                  <td>{formatCurrency(b.totalAmount)}</td>
                  <td>
                    <span className={statusClass(b.bookingStatus)}>{b.bookingStatus}</span>
                  </td>
                  <td>
                    <span className={statusClass(b.paymentStatus)}>{b.paymentStatus}</span>
                  </td>
                  <td className="table-actions">
                    {b.bookingStatus !== 'declined' && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={updatingId === b._id}
                        onClick={() => setRescheduleBooking(b)}
                      >
                        Resched
                      </button>
                    )}
                    <select
                      className="select-inline"
                      value=""
                      disabled={updatingId === b._id}
                      onChange={(e) => {
                        if (e.target.value) updateStatus(b._id, e.target.value);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Update…</option>
                      {ADMIN_ACTIONS.map((s) => (
                        <option key={s} value={s} disabled={b.bookingStatus === s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {rescheduleBooking && (
        <RescheduleModal
          booking={rescheduleBooking}
          onClose={() => setRescheduleBooking(null)}
          onSaved={load}
        />
      )}
    </>
  );
}
