const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatDate(iso) {
  return DATE_FMT.format(new Date(iso + 'T00:00:00Z'));
}

function formatAmount(cents) {
  return (cents / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });
}

function SkeletonRows() {
  return (
    <div className="skeleton-receipt">
      {[100, 75, 88].map((w, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton" style={{ width: 44, height: 10 }} />
          <div className="skeleton" style={{ width: 60, height: 10 }} />
          <div className="skeleton" style={{ width: w, height: 10, flex: 1 }} />
          <div className="skeleton" style={{ width: 48, height: 10 }} />
        </div>
      ))}
    </div>
  );
}

export default function ExpenseList({ expenses, loading }) {
  if (loading) return <SkeletonRows />;

  if (expenses.length === 0) {
    return <div className="status-msg">no entries found.</div>;
  }

  return (
    <div className="receipt-rows">
      {expenses.map((e) => (
        <div key={e.id} className="receipt-row">
          <span className="row-date">{formatDate(e.date)}</span>
          <span className="row-cat">{e.category}</span>
          <span className="row-desc">{e.description || '—'}</span>
          <span className="row-amount">{formatAmount(e.amount_cents)}</span>
        </div>
      ))}
    </div>
  );
}
