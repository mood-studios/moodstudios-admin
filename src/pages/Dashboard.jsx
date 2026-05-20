import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { bookingApi, userApi } from '../api';
import { formatCurrency, formatDate, statusClass } from '../utils/format';

const WINDOW_OPTIONS = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
];

const BOOKING_STATES = ['pending', 'confirmed', 'completed', 'declined'];

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const normalizeStatus = (value, fallback = 'unknown') => {
  if (!value || typeof value !== 'string') return fallback;
  return value.toLowerCase();
};

const getServiceLabel = (booking) => {
  const fromArray = booking.services?.[0];
  if (fromArray?.name) return fromArray.name;
  if (typeof fromArray === 'string') return fromArray;
  if (booking.serviceId?.name) return booking.serviceId.name;
  if (booking.serviceName) return booking.serviceName;
  return 'Unknown service';
};

const buildDailyTrend = (bookings, days) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const labels = [];
  const map = new Map();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    labels.push(label);
    map.set(label, 0);
  }

  bookings.forEach((booking) => {
    const date = toDate(booking.bookingDate);
    if (!date || date < start) return;
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!map.has(label)) return;
    map.set(label, map.get(label) + 1);
  });

  return labels.map((label) => ({ label, value: map.get(label) || 0 }));
};

const buildTrendPoints = (data, width, height, padding) => {
  if (!data.length) return '';
  const max = Math.max(...data.map((item) => item.value), 1);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  return data
    .map((item, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * innerW;
      const y = padding + (1 - item.value / max) * innerH;
      return `${x},${y}`;
    })
    .join(' ');
};

const buildDonutGradient = (rows) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!total) return 'conic-gradient(#e5e7eb 0deg 360deg)';
  let offset = 0;
  return `conic-gradient(${rows
    .map((row) => {
      const from = (offset / total) * 360;
      offset += row.value;
      const to = (offset / total) * 360;
      return `${row.color} ${from}deg ${to}deg`;
    })
    .join(', ')})`;
};

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [windowKey, setWindowKey] = useState(WINDOW_OPTIONS[1].key);
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
  const selectedWindow = WINDOW_OPTIONS.find((option) => option.key === windowKey) || WINDOW_OPTIONS[1];

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (selectedWindow.days - 1));

  const windowBookings = bookings.filter((booking) => {
    const date = toDate(booking.bookingDate);
    return date && date >= cutoff;
  });

  const paymentBreakdown = windowBookings.reduce(
    (acc, booking) => {
      const status = normalizeStatus(booking.paymentStatus, 'unknown');
      if (status === 'paid') acc.paid += 1;
      else if (status === 'unpaid') acc.unpaid += 1;
      else acc.other += 1;
      return acc;
    },
    { paid: 0, unpaid: 0, other: 0 }
  );

  const statusCounts = windowBookings.reduce(
    (acc, booking) => {
      const status = normalizeStatus(booking.bookingStatus, 'unknown');
      if (Object.hasOwn(acc, status)) acc[status] += 1;
      else acc.unknown += 1;
      return acc;
    },
    { pending: 0, confirmed: 0, completed: 0, declined: 0, unknown: 0 }
  );

  const serviceCounts = windowBookings.reduce((acc, booking) => {
    const label = getServiceLabel(booking);
    acc.set(label, (acc.get(label) || 0) + 1);
    return acc;
  }, new Map());
  const topServices = Array.from(serviceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const trendData = buildDailyTrend(windowBookings, selectedWindow.days);
  const rangeRevenue = windowBookings
    .filter((booking) => normalizeStatus(booking.paymentStatus) === 'paid')
    .reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
  const averageBookingValue = windowBookings.length > 0 ? rangeRevenue / windowBookings.length : 0;
  const paidBookings = paymentBreakdown.paid;
  const conversionRate = windowBookings.length ? (paidBookings / windowBookings.length) * 100 : 0;
  const topServiceText = topServices[0]?.[0] || 'No data';
  const topServiceCount = topServices[0]?.[1] || 0;

  const donutRows = [
    { label: 'Paid', value: paymentBreakdown.paid, color: '#3b82f6' },
    { label: 'Unpaid', value: paymentBreakdown.unpaid, color: '#f59e0b' },
    { label: 'Other', value: paymentBreakdown.other, color: '#94a3b8' },
  ];
  const donutTotal = donutRows.reduce((sum, row) => sum + row.value, 0);
  const donutBackground = buildDonutGradient(donutRows);

  const chartWidth = 700;
  const chartHeight = 220;
  const chartPadding = 20;
  const trendPoints = buildTrendPoints(trendData, chartWidth, chartHeight, chartPadding);
  const trendMax = Math.max(...trendData.map((item) => item.value), 1);

  const kpiCards = [
    { label: 'Window bookings', value: windowBookings.length },
    { label: 'Paid bookings', value: paidBookings },
    { label: 'Customers', value: customerCount },
    { label: 'Conversion rate', value: `${conversionRate.toFixed(1)}%` },
    { label: 'Revenue', value: formatCurrency(rangeRevenue) },
    { label: 'Avg booking', value: formatCurrency(averageBookingValue) },
    { label: 'Top service', value: topServiceText, helper: `${topServiceCount} bookings` },
    { label: 'Pending review', value: pending },
  ];

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

          <section className="panel analytics-panel">
            <header className="panel__head analytics-panel__head">
              <h2>Analytics</h2>
              <label>
                <span className="muted">Time window</span>
                <select
                  className="select-inline"
                  value={windowKey}
                  onChange={(event) => setWindowKey(event.target.value)}
                >
                  {WINDOW_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </header>

            <div className="analytics-top">
              <article className="analytics-card analytics-card--line">
                <h3>Customer bookings trend</h3>
                <svg
                  className="line-chart"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  role="img"
                  aria-label="Bookings trend line"
                >
                  <polyline className="line-chart__line" points={trendPoints} />
                  {trendData.map((point, index) => {
                    const x =
                      chartPadding +
                      (index / Math.max(trendData.length - 1, 1)) * (chartWidth - chartPadding * 2);
                    const y = chartPadding + (1 - point.value / trendMax) * (chartHeight - chartPadding * 2);
                    return (
                      <circle
                        key={`${point.label}-${index}`}
                        className="line-chart__dot"
                        cx={x}
                        cy={y}
                        r="3.2"
                      >
                        <title>{`${point.label}: ${point.value} bookings`}</title>
                      </circle>
                    );
                  })}
                </svg>
                <div className="line-chart__labels">
                  <span>{trendData[0]?.label || ''}</span>
                  <span>{trendData[Math.floor(trendData.length / 2)]?.label || ''}</span>
                  <span>{trendData[trendData.length - 1]?.label || ''}</span>
                </div>
              </article>

              <article className="analytics-card analytics-card--donut">
                <h3>Customer bookings</h3>
                <div className="donut-wrap">
                  <div className="donut-chart" style={{ background: donutBackground }}>
                    <div className="donut-chart__center">
                      <strong>{donutTotal}</strong>
                      <span>Bookings</span>
                    </div>
                  </div>
                  <ul className="analytics-list analytics-list--legend">
                    {donutRows.map((row) => (
                      <li key={row.label}>
                        <span>
                          <i style={{ backgroundColor: row.color }} />
                          {row.label}
                        </span>
                        <strong>{row.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>

            <div className="kpi-grid">
              {kpiCards.map((item) => (
                <article className="kpi-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {item.helper ? <small>{item.helper}</small> : null}
                </article>
              ))}
            </div>

            <div className="analytics-grid">
              <article className="analytics-card">
                <h3>Booking funnel</h3>
                <ul className="analytics-list">
                  {BOOKING_STATES.map((state) => (
                    <li key={state}>
                      <span>{state}</span>
                      <strong>{statusCounts[state]}</strong>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="analytics-card">
                <h3>Top services</h3>
                {topServices.length === 0 ? (
                  <p className="muted">No booking data in this window.</p>
                ) : (
                  <ul className="analytics-list">
                    {topServices.map(([name, count]) => (
                      <li key={name}>
                        <span>{name}</span>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
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
