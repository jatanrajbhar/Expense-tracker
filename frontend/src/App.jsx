import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchExpenses, fetchCategories } from './api';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import Filters from './components/Filters';
import TicketLogo from './components/TicketLogo';

const TODAY = new Date().toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
});

const PERIOD_LABELS = { day: "Today's", week: "This Week's", month: "This Month's", all: '' };

function periodBounds(period) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = ymd(now);

  if (period === 'day')   return { from: today, to: today };

  if (period === 'week') {
    const dow = now.getDay();                       // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    return { from: ymd(monday), to: today };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: ymd(start), to: today };
  }

  return null; // 'all' — no bounds
}

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, cats] = await Promise.all([
        fetchExpenses({ category, sort }),
        fetchCategories(),
      ]);
      setExpenses(data);
      setAllCategories(cats);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const handleCreated = useCallback(() => { loadExpenses(); }, [loadExpenses]);

  // Period filter is applied client-side on top of the server-filtered list
  const displayed = useMemo(() => {
    const bounds = periodBounds(period);
    if (!bounds) return expenses;
    return expenses.filter((e) => e.date >= bounds.from && e.date <= bounds.to);
  }, [expenses, period]);

  const total = displayed.reduce((sum, e) => sum + e.amount_cents, 0);
  const fmtTotal = (total / 100).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR',
  });

  const totalLabel = [PERIOD_LABELS[period], category].filter(Boolean).join(' ') || '';

  return (
    <div className="app">
      <div className="ticket-perf" />

      <div className="ticket-body">
        {/* ── Header ── */}
        <header className="ticket-header">
          <div className="ticket-logo-wrap">
            <TicketLogo width={44} />
          </div>
          <div className="ticket-title">Expense Tracker</div>
          <div className="ticket-subtitle">Issued {TODAY}</div>
          <div className="ticket-tagline">
            Valid for one honest budget review<br />
            <span className="ticket-tagline-fine">Non-transferable &middot; Terms apply</span>
          </div>
        </header>

        {/* ── New entry form (hidden on print) ── */}
        <div className="form-section">
          <p className="section-label">New Entry</p>
          <ExpenseForm onCreated={handleCreated} />
        </div>

        <hr className="dashed-rule form-divider" />

        {/* ── Expense list ── */}
        <p className="section-label">Expenses</p>

        <div className="list-controls">
          {/* Period toggle */}
          <div className="period-filter no-print">
            {['day', 'week', 'month', 'all'].map((p) => (
              <button
                key={p}
                className={`period-btn${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Category + sort */}
          <Filters
            categories={allCategories}
            selectedCategory={category}
            sort={sort}
            onCategoryChange={setCategory}
            onSortChange={setSort}
          />
        </div>

        {error && (
          <div className="alert alert-error no-print">
            {error}&nbsp;
            <button className="btn-link" onClick={loadExpenses}>Retry</button>
          </div>
        )}

        <ExpenseList expenses={displayed} loading={loading} />

        {/* ── Total ── */}
        {!loading && displayed.length > 0 && (
          <div className="receipt-total">
            <span className="total-label">
              {totalLabel ? `${totalLabel} total` : 'Total'}
            </span>
            <span className="total-amount">{fmtTotal}</span>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="ticket-footer">* keep your receipts *</div>

        {/* ── Print button (bottom of ticket, hidden on print) ── */}
        <div className="print-section no-print">
          <button className="btn-print-bottom" onClick={() => window.print()}>
            Print
          </button>
        </div>

        {/* ── Humorous message — visible only when printing ── */}
        <div className="print-only-msg">
          <p className="print-msg-headline">You actually printed this. Respect.</p>
          <p>This document certifies that real money was spent on real things.</p>
          <p>Whether wisely is left as an exercise to the reader.</p>
          <p className="print-msg-fine">
            No refunds &nbsp;&middot;&nbsp; No exchanges &nbsp;&middot;&nbsp; No regrets (probably)
          </p>
        </div>
      </div>

      <div className="ticket-perf" />
    </div>
  );
}
