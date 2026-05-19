import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { bookingApi, userApi } from '../api';
import { formatCurrency, formatDate, statusClass } from '../utils/format';

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([bookingApi.getAll(), userApi.getCustomers()])
      .then(([bRes, cRes]) => {
        setBookings(bRes.data || []);
        setCustomerCount((cRes.data || []).length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pending = bookings.filter((b) => b.bookingStatus === 'pending').length;
  const paidRevenue = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const recent = bookings.slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Studio overview at a glance" />

      {loading ? (
        <p className="muted">Loading stats…</p>
      ) : (
        <>
          <section className="stat-grid">
            <article className="stat-card">
              <span className="stat-card__label">Total bookings</span>
              <strong className="stat-card__value">{bookings.length}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Pending review</span>
              <strong className="stat-card__value stat-card__value--warn">{pending}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Customers</span>
              <strong className="stat-card__value">{customerCount}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-card__label">Paid revenue</span>
              <strong className="stat-card__value">{formatCurrency(paidRevenue)}</strong>
            </article>
          </section>

          <section className="panel">
            <header className="panel__head">
              <h2>Recent bookings</h2>
              <Link to="/bookings" className="btn btn--ghost btn--sm">
                View all
              </Link>
            </header>
            {recent.length === 0 ? (
              <p className="muted panel__empty">No bookings yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((b) => (
                    <tr key={b._id}>
                      <td>{b.userId?.name || '—'}</td>
                      <td>
                        {formatDate(b.bookingDate)} · {b.bookingTime}
                      </td>
                      <td>{formatCurrency(b.totalAmount)}</td>
                      <td>
                        <span className={statusClass(b.bookingStatus)}>{b.bookingStatus}</span>
                      </td>
                      <td>
                        <span className={statusClass(b.paymentStatus)}>{b.paymentStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
