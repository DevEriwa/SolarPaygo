import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Zap,
  Calendar,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  PieChart,
  Users,
  Percent,
  CheckCircle,
  Award,
  Search
} from 'lucide-react';
import { BASE_URL } from '../../config';

function formatNaira(val) {
  if (val == null) return '₦0';
  return '₦' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(dateStr);
  }
}

export default function InvestorDashboard({ handleLogout }) {
  // 'daily', 'weekly', 'monthly', 'yearly'
  const [cycleTab, setCycleTab] = useState('monthly');
  const [historyTab, setHistoryTab] = useState('current'); // 'current', 'all', 'past'
  const [rowsPerPage, setRowsPerPage] = useState(10); // 10, 25, 50, 100, 'all'
  const [currentPage, setCurrentPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');

  const fetchPortfolio = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/investor/portfolio`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401 && typeof handleLogout === 'function') {
        handleLogout();
      }
      const err = await res.text();
      throw new Error(err || 'Failed to load portfolio.');
    }
    return res.json();
  };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['investorPortfolio'],
    queryFn: fetchPortfolio,
    refetchInterval: 30000 // auto-refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)' }}>
        <RefreshCw size={36} className="spin-animation" style={{ color: 'var(--primary-accent)', marginBottom: '16px' }} />
        <h3 style={{ color: '#fff', fontWeight: 600 }}>Loading Investment Portfolio...</h3>
        <p style={{ fontSize: '0.88rem' }}>Synchronizing smart remittance ledgers and meter telemetry</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div className="glass-panel" style={{ padding: '32px', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
          <h2 style={{ color: '#fff', marginBottom: '8px' }}>Portfolio Access Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
            {error?.message || 'Unable to retrieve your investment portfolio. Please contact system support.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => refetch()} className="action-btn" style={{ background: 'var(--primary-accent)', color: '#000' }}>
              <RefreshCw size={16} /> Retry
            </button>
            {typeof handleLogout === 'function' && (
              <button onClick={handleLogout} className="action-btn" style={{ borderColor: 'var(--border-color)', color: '#fff' }}>
                Log Out
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const group = data?.Group || data?.group || {};
  const fin = data?.Financials || data?.financials || {};
  const meters = data?.Meters || data?.meters || [];
  const settlements = data?.Settlements || data?.settlements || [];
  const recentTx = data?.RecentTransactions || data?.recentTransactions || [];

  const activeMeterCount = meters.filter(m => m.status === 'Active').length;
  const totalPowerW = meters.reduce((sum, m) => sum + (Number(m.power) || 0), 0);

  // Period earnings selection calculations (Strictly investor yield, never company gross)
  let periodRemitted = 0;
  let periodTitle = "This Month's Remittance";

  if (cycleTab === 'daily') {
    periodRemitted = fin.remittedToday || 0;
    periodTitle = "Today's Remittance";
  } else if (cycleTab === 'weekly') {
    periodRemitted = fin.remittedWeek || 0;
    periodTitle = "This Week's Remittance";
  } else if (cycleTab === 'monthly') {
    periodRemitted = fin.remittedMonth || 0;
    periodTitle = "This Month's Remittance";
  } else if (cycleTab === 'yearly') {
    periodRemitted = fin.remittedYear || 0;
    periodTitle = "Current Cycle Remittance (Capped)";
  }

  // Filter to only include cash flows that directly credited this investor
  const eligibleTransactions = recentTx.filter(t => (Number(t.remittanceCredited || t.investorShareAmount) || 0) > 0);

  // Helper to determine if transaction belongs to current cycle
  const isCurrentCycleTx = (t) => {
    if (typeof t.isCurrentCycle === 'boolean') return t.isCurrentCycle;
    if (typeof t.IsCurrentCycle === 'boolean') return t.IsCurrentCycle;
    if (fin.cycleStartDate && fin.cycleEndDate) {
      const d = new Date(t.transactionDate);
      return d >= new Date(fin.cycleStartDate) && d < new Date(fin.cycleEndDate);
    }
    return true;
  };

  const currentYearTransactions = eligibleTransactions.filter(t => isCurrentCycleTx(t));
  const pastYearTransactions = eligibleTransactions.filter(t => !isCurrentCycleTx(t));

  const activeTransactions = historyTab === 'current'
    ? currentYearTransactions
    : historyTab === 'past'
    ? pastYearTransactions
    : eligibleTransactions;

  const filteredTransactions = activeTransactions.filter(t => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    const meterStr = (t.hardwareId || '').toLowerCase();
    const dateStr = new Date(t.transactionDate).toLocaleString().toLowerCase();
    const statusStr = (t.status || '').toLowerCase();
    const amountStr = String(t.remittanceCredited || t.investorShareAmount || '');
    return meterStr.includes(q) || dateStr.includes(q) || statusStr.includes(q) || amountStr.includes(q);
  });

  const currentViewSum = activeTransactions.reduce((acc, t) => acc + (Number(t.remittanceCredited || t.investorShareAmount) || 0), 0);

  const totalItems = filteredTransactions.length;
  const pageSize = rowsPerPage === 'all' ? (totalItems || 1) : Number(rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = rowsPerPage === 'all' ? 0 : (safePage - 1) * pageSize;
  const paginatedTransactions = rowsPerPage === 'all'
    ? filteredTransactions
    : filteredTransactions.slice(startIndex, startIndex + pageSize);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Investor Portal
            </span>
            {group.isReturnCapital ? (
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} /> 12-Month Liquidation Notice Active
              </span>
            ) : (
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} /> Active Smart Remittance
              </span>
            )}

            {fin.reoccurringDate && (
              <span style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <Calendar size={12} /> Reoccurring Date: {formatDate(fin.reoccurringDate)}
              </span>
            )}

            {group.isReturnCapital && fin.finalSettlementDate && (
              <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle size={12} /> Final Settlement: {formatDate(fin.finalSettlementDate)}
              </span>
            )}

            <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem' }}>
              Settlement Cadence: {group.settlementCycle || 'Monthly'}
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={26} color="var(--primary-accent)" /> {group.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {group.description || 'Infrastructure energy deployment portfolio with continuous automated cash flow remittances.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="action-btn"
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={isFetching ? 'spin-animation' : ''} />
            <span>{isFetching ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* ─── Target Annual Cap Notification Banner (When cap is reached) ──── */}
      {fin.isCapReached && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '8px' }}>
              <Award size={26} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', marginBottom: '2px' }}>
                Annual Target Yield Milestone Satisfied ({formatNaira(fin.annualRoiMilestone)})
              </h3>
              <p style={{ color: '#e5e7eb', fontSize: '0.86rem', lineHeight: 1.4 }}>
                {fin.isCapitalReturnCycle ? (
                  <>
                    Your agreed annual return of <strong>10% ROI ({formatNaira(fin.baseYield)})</strong> plus <strong>Capital ({formatNaira(fin.capitalToReturn)})</strong> totaling <strong>{formatNaira(fin.annualRoiMilestone)}</strong> has been completely fulfilled for this cycle.
                  </>
                ) : (
                  <>
                    Your agreed annual return of <strong>{formatNaira(fin.annualRoiMilestone)}</strong> has been completely fulfilled for this cycle.
                  </>
                )}
              </p>
            </div>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>Annual Milestone</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>100% Reached</div>
          </div>
        </div>
      )}

      {/* ─── Metric Cards Grid ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
        {/* Card 1: Principal Capital */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Base Principal Capital
            </span>
            <div style={{ background: 'rgba(56, 189, 248, 0.12)', padding: '8px', borderRadius: '8px' }}>
              <ShieldCheck size={20} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff' }}>
            {formatNaira(fin.investorsCapital)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> 100% Capital Redeemable
          </div>
        </div>

        {/* Card 2: Annual ROI Target */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Target Annual Yield ({fin.roiPercentage}%)
            </span>
            <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '8px', borderRadius: '8px' }}>
              <Percent size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
            {formatNaira(fin.isCapitalReturnCycle ? fin.annualRoiMilestone : (fin.baseYield || fin.annualRoiMilestone))}
          </div>

          {/* Capital Return Indicators */}
          {fin.isCapitalReturnCycle ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 700 }}>
                + {formatNaira(fin.capitalToReturn || fin.investorsCapital)} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.78rem' }}>Adjusted exit rate</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#34d399', marginTop: '2px' }}>
                10% ROI ({formatNaira(fin.baseYield)}) + Capital ({formatNaira(fin.capitalToReturn)})
              </div>
            </div>
          ) : fin.isCapitalReturnQueued ? (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600 }}>
                15% running till cycle end ({formatDate(fin.reoccurringDate)})
              </div>
              <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '2px' }}>
                New cycle target: 10% ({formatNaira(Math.round(fin.investorsCapital * 0.10))}) + Capital ({formatNaira(fin.investorsCapital)})
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Auto-renews indefinitely every year
            </div>
          )}

          {/* Detailed Cycle, Reoccurring, and Settlement Dates */}
          {group.isReturnCapital && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.76rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: '#38bdf8', display: 'flex', justifyContent: 'space-between' }}>
                <span>Reoccurring Date:</span>
                <strong style={{ color: '#fff' }}>{formatDate(fin.reoccurringDate)}</strong>
              </div>
              {fin.newCycleStartDate && (
                <div style={{ color: '#fbbf24', display: 'flex', justifyContent: 'space-between' }}>
                  <span>New Cycle Start Date:</span>
                  <strong style={{ color: '#fff' }}>{formatDate(fin.newCycleStartDate)}</strong>
                </div>
              )}
              {fin.finalSettlementDate && (
                <div style={{ color: '#10b981', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Final Settlement Date:</span>
                  <strong style={{ color: '#fff' }}>{formatDate(fin.finalSettlementDate)}</strong>
                </div>
              )}
            </div>
          )}

          {!group.isReturnCapital && group.investmentStartDate && (
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Reoccurring Date: <strong style={{ color: '#38bdf8' }}>{formatDate(fin.reoccurringDate)}</strong>
            </div>
          )}
        </div>

        {/* Card 3: Year Cash Flow Remitted (Strictly Capped at Annual ROI) */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Year Remitted
            </span>
            <div style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '8px', borderRadius: '8px' }}>
              <TrendingUp size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff' }}>
            {formatNaira(fin.remittedYear)}
          </div>
          {/* Progress Bar & Cap Milestone Info */}
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              <span>{fin.progressPercent}% of Annual Cap</span>
              <span>Rem: {formatNaira(fin.remainingToMilestone)}</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(2, fin.progressPercent))}%`,
                  background: 'linear-gradient(90deg, #10b981, #38bdf8)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: All-Time Remittance & Payout Balance */}
        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Remitted All-Time
            </span>
            <div style={{ background: 'rgba(139, 92, 246, 0.12)', padding: '8px', borderRadius: '8px' }}>
              <DollarSign size={20} color="#a78bfa" />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#a78bfa' }}>
            {formatNaira(fin.remittedAllTime)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span>Settled: <strong>{formatNaira(fin.totalSettled)}</strong></span>
            <span style={{ color: fin.pendingSettlement > 0 ? '#38bdf8' : 'var(--text-muted)', fontWeight: 700 }}>
              Accrued / Due: {formatNaira(fin.pendingSettlement)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Cash Flow Aggregation Panel (Daily / Weekly / Monthly / Yearly) ── */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={20} color="var(--primary-accent)" /> Cash Flow Aggregation & Yield
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
              Direct cash flow remittances credited to your portfolio.
            </p>
          </div>

          {/* Interactive Cycle Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setCycleTab('daily')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: cycleTab === 'daily' ? 'var(--primary-accent)' : 'transparent',
                color: cycleTab === 'daily' ? 'var(--bg-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Daily
            </button>
            <button
              onClick={() => setCycleTab('weekly')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: cycleTab === 'weekly' ? 'var(--primary-accent)' : 'transparent',
                color: cycleTab === 'weekly' ? 'var(--bg-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Weekly
            </button>
            <button
              onClick={() => setCycleTab('monthly')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: cycleTab === 'monthly' ? 'var(--primary-accent)' : 'transparent',
                color: cycleTab === 'monthly' ? 'var(--bg-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycleTab('yearly')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: cycleTab === 'yearly' ? 'var(--primary-accent)' : 'transparent',
                color: cycleTab === 'yearly' ? 'var(--bg-dark)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Annual Cap
            </button>
          </div>
        </div>

        {/* Dynamic Period Metrics Breakdown (Strictly Investor Figures) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Metric 1: Selected Period Investor Remittance */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              {periodTitle}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
              {formatNaira(periodRemitted)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {fin.isCapReached && periodRemitted === 0
                ? 'Target Annual Yield Milestone Satisfied'
                : (cycleTab === 'yearly' && fin.isCapReached ? 'Annual Yield Satisfied' : 'Directly credited to your portfolio pool')}
            </div>
          </div>

          {/* Metric 2: Annual Target Cap */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Target Annual Milestone
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
              {formatNaira(fin.annualRoiMilestone)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {fin.isCapitalReturnCycle
                ? `10% Yield (${formatNaira(fin.baseYield)}) + Capital (${formatNaira(fin.capitalToReturn)})`
                : (fin.isCapitalReturnQueued ? '15% ROI (10% + Capital on new cycle)' : 'Agreed annual yield return')}
            </div>
          </div>

          {/* Metric 3: Remittance Share Rate */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Remittance Share Allocation
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
              {group.remittanceSharePercent || 100}%
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Active revenue sharing rate
            </div>
          </div>

          {/* Metric 4: Settlement Cadence & Balance */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Settlement Cadence & Payout
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
              {group.settlementCycle || 'Monthly'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#38bdf8', marginTop: '4px' }}>
              Current Pending Due: <strong>{formatNaira(fin.pendingSettlement)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Portfolio Meters Fleet ───────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--primary-accent)" /> Deployed Infrastructure Assets ({meters.length})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
              Active energy generation units linked to your portfolio.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
              • {activeMeterCount} Active
            </span>
            <span style={{ fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
              ⚡ {totalPowerW.toFixed(0)} W Live Load
            </span>
          </div>
        </div>

        {meters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No meters assigned to this group yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Hardware / Meter ID</th>
                  <th style={{ padding: '12px 14px' }}>Customer / Site</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Energy Balance</th>
                  <th style={{ padding: '12px 14px' }}>Total kWh</th>
                  <th style={{ padding: '12px 14px' }}>Live Power</th>
                  <th style={{ padding: '12px 14px' }}>Relay</th>
                </tr>
              </thead>
              <tbody>
                {meters.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#fff' }}>
                      {m.hardwareId}
                      {m.stronMeterId && <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', display: 'block' }}>ID: {m.stronMeterId}</span>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>{m.ownerName || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        background: m.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: m.status === 'Active' ? '#10b981' : '#ef4444'
                      }}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#fff' }}>{(Number(m.availableUnits) || 0).toFixed(1)} kWh</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{(Number(m.cumulativeKwhConsumed) || 0).toFixed(1)} kWh</td>
                    <td style={{ padding: '12px 14px', color: '#38bdf8' }}>{Number(m.power) || 0} W</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        background: m.relayState === 'Connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: m.relayState === 'Connected' ? '#10b981' : '#ef4444'
                      }}>
                        {m.relayState || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Remittance Cash Flows History (Current Year & All-Time) ── */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={22} color="var(--primary-accent)" /> Remittance Cash Flows History
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Direct remittances credited to your investment portfolio from energy operations.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {historyTab === 'current' ? 'Current Cycle Total:' : historyTab === 'past' ? 'Past Cycles Total:' : 'All-Time Credited:'}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
              {formatNaira(currentViewSum)}
            </span>
          </div>
        </div>

        {/* Tab Switcher: Current Year History vs All Time History vs Past Cycles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setHistoryTab('current'); setCurrentPage(1); }}
              className={`filter-tab ${historyTab === 'current' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                padding: '8px 16px',
                background: historyTab === 'current' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.04)',
                color: historyTab === 'current' ? 'var(--bg-dark)' : 'var(--text-main)',
                fontWeight: historyTab === 'current' ? 700 : 500,
                border: '1px solid',
                borderColor: historyTab === 'current' ? 'var(--primary-accent)' : 'var(--border-color)'
              }}
            >
              <span>Current Year History</span>
              <span style={{
                background: historyTab === 'current' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.74rem'
              }}>
                {currentYearTransactions.length}
              </span>
            </button>

            <button
              onClick={() => { setHistoryTab('all'); setCurrentPage(1); }}
              className={`filter-tab ${historyTab === 'all' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                padding: '8px 16px',
                background: historyTab === 'all' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.04)',
                color: historyTab === 'all' ? 'var(--bg-dark)' : 'var(--text-main)',
                fontWeight: historyTab === 'all' ? 700 : 500,
                border: '1px solid',
                borderColor: historyTab === 'all' ? 'var(--primary-accent)' : 'var(--border-color)'
              }}
            >
              <span>All Time History</span>
              <span style={{
                background: historyTab === 'all' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.74rem'
              }}>
                {eligibleTransactions.length}
              </span>
            </button>

            {pastYearTransactions.length > 0 && (
              <button
                onClick={() => { setHistoryTab('past'); setCurrentPage(1); }}
                className={`filter-tab ${historyTab === 'past' ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  padding: '8px 16px',
                  background: historyTab === 'past' ? 'var(--primary-accent)' : 'rgba(255,255,255,0.04)',
                  color: historyTab === 'past' ? 'var(--bg-dark)' : 'var(--text-main)',
                  fontWeight: historyTab === 'past' ? 700 : 500,
                  border: '1px solid',
                  borderColor: historyTab === 'past' ? 'var(--primary-accent)' : 'var(--border-color)'
                }}
              >
                <span>Past Cycles</span>
                <span style={{
                  background: historyTab === 'past' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.74rem'
                }}>
                  {pastYearTransactions.length}
                </span>
              </button>
            )}
          </div>

          {/* Search box & rows selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search meter, date..."
                value={historySearch}
                onChange={(e) => { setHistorySearch(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '6px 26px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'white',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              {historySearch && (
                <button
                  onClick={() => { setHistorySearch(''); setCurrentPage(1); }}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Display Count / Rows selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>Show:</span>
              {[10, 25, 50, 100, 'all'].map(r => (
                <button
                  key={r}
                  onClick={() => { setRowsPerPage(r); setCurrentPage(1); }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: rowsPerPage === r ? 'var(--primary-accent)' : 'var(--border-color)',
                    background: rowsPerPage === r ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: rowsPerPage === r ? 'var(--primary-accent)' : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: rowsPerPage === r ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {historySearch
              ? `No transactions matched "${historySearch}".`
              : historyTab === 'current'
              ? 'No remittance cash flows recorded for the current year cycle yet.'
              : 'No remittance cash flows recorded for this portfolio yet.'}
          </div>
        ) : (
          <div>
            {/* Scrollable table container with side scroll and sticky header */}
            <div
              className="custom-table-scroll"
              style={{
                maxHeight: '460px',
                overflowY: 'auto',
                overflowX: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#1c1c1e', zIndex: 2, borderBottom: '1px solid var(--border-color)' }}>
                  <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 14px' }}>Date & Time</th>
                    <th style={{ padding: '12px 14px' }}>Meter / Asset</th>
                    <th style={{ padding: '12px 14px' }}>Remittance Credited</th>
                    <th style={{ padding: '12px 14px' }}>Cycle / Period</th>
                    <th style={{ padding: '12px 14px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map(t => {
                    const isCurrent = isCurrentCycleTx(t);
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isCurrent ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(t.transactionDate).toLocaleDateString()} {new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>{t.hardwareId}</td>
                        <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 700, fontSize: '0.95rem' }}>
                          +{formatNaira(t.remittanceCredited || t.investorShareAmount)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {isCurrent ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}>
                              ● Current Year (Active)
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(148, 163, 184, 0.12)',
                              color: '#94a3b8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.74rem',
                              fontWeight: 600
                            }}>
                              Past Cycle ({t.cycleYear || new Date(t.transactionDate).getFullYear()})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}>
                            {t.status || 'Credited to Portfolio'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Showing <strong style={{ color: '#fff' }}>{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong style={{ color: '#fff' }}>{rowsPerPage === 'all' ? totalItems : Math.min(startIndex + pageSize, totalItems)}</strong> of <strong style={{ color: '#fff' }}>{totalItems}</strong> entries
                {filteredTransactions.length > 10 && <span style={{ marginLeft: '8px', color: 'var(--primary-accent)' }}>• Side scroll enabled</span>}
              </div>

              {rowsPerPage !== 'all' && totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: safePage === 1 ? 'var(--text-muted)' : '#fff',
                      cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.78rem'
                    }}
                    title="First Page"
                  >
                    « First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={safePage === 1}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: safePage === 1 ? 'var(--text-muted)' : '#fff',
                      cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    ‹ Prev
                  </button>

                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0 6px' }}>
                    Page <strong style={{ color: '#fff' }}>{safePage}</strong> of <strong style={{ color: '#fff' }}>{totalPages}</strong>
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={safePage === totalPages}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: safePage === totalPages ? 'var(--text-muted)' : '#fff',
                      cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    Next ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-color)',
                      color: safePage === totalPages ? 'var(--text-muted)' : '#fff',
                      cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '0.78rem'
                    }}
                    title="Last Page"
                  >
                    Last »
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Historical Settlement Records ────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DollarSign size={20} color="var(--primary-accent)" /> Settlement Payout Ledger
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
          Recorded payouts disbursed to your account by system administrators.
        </p>

        {settlements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No settlement payouts recorded yet. Pending distribution balance: <strong>{formatNaira(fin.pendingSettlement)}</strong>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Amount</th>
                  <th style={{ padding: '10px 14px' }}>Cycle</th>
                  <th style={{ padding: '10px 14px' }}>Reference</th>
                  <th style={{ padding: '10px 14px' }}>Notes</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {new Date(s.settledAt).toLocaleDateString()} {new Date(s.settledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                      {formatNaira(s.amount)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#38bdf8' }}>{s.settlementCycle || 'Monthly'}</td>
                    <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>{s.reference || '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{s.notes || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem' }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
