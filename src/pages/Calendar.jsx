import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { blockedDayApi } from '../api';
import { formatDate } from '../utils/format';

export default function Calendar() {
  const { confirmSave, confirmDelete } = useAdminConfirm();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    blockedDayApi
      .list()
      .then((res) => setBlocked(res.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBlock = async (e) => {
    e.preventDefault();
    if (!date) {
      setError('Pick a date to block.');
      return;
    }

    const ok = await confirmSave(
      `Block ${date} from customer bookings? Existing bookings on that day are not removed.`,
      'Block date'
    );
    if (!ok) return;

    setError('');
    setSaving(true);
    try {
      await blockedDayApi.block(date, reason);
      setDate('');
      setReason('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (row) => {
    const day = row.date ? formatDate(row.date) : 'this date';
    const ok = await confirmDelete(`Unblock ${day}? Customers can book again on that day.`, 'Unblock date');
    if (!ok) return;
    setError('');
    try {
      await blockedDayApi.unblock(row._id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title="Studio calendar"
        subtitle="Block specific dates so they cannot be booked online or by admin"
      />

      {error && <p className="form-error">{error}</p>}

      <section className="panel" style={{ maxWidth: '36rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Block a date</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Closed weekdays from studio settings still apply. Use this for holidays, maintenance, or
          one-off closures.
        </p>
        <form className="form-stack" onSubmit={handleBlock}>
          <label>
            Date
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Reason (optional)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Holiday, studio maintenance"
            />
          </label>
          <footer className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Blocking…' : 'Block date'}
            </button>
          </footer>
        </form>
      </section>

      <section className="panel">
        <h3 style={{ marginTop: 0 }}>Blocked dates</h3>
        {loading ? (
          <p className="muted panel__empty">Loading…</p>
        ) : blocked.length === 0 ? (
          <p className="muted panel__empty">No blocked dates. All bookable days follow the regular schedule.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Blocked by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {blocked.map((row) => (
                <tr key={row._id}>
                  <td>
                    <strong>{formatDate(row.date)}</strong>
                  </td>
                  <td>{row.reason || '—'}</td>
                  <td>{row.blockedBy?.name || '—'}</td>
                  <td className="table-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--danger"
                      onClick={() => handleUnblock(row)}
                    >
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
