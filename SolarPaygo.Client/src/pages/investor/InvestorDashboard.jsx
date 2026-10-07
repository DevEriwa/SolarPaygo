import { useState, useEffect } from 'react';
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
  Percent
} from 'lucide-react';
import { BASE_URL } from '../../config';

function formatNaira(val) {
  if (val == null) return '₦0';
  return '₦' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function InvestorDashboard({ handleLogout }) {
  const [cycleTab, setCycleTab] = useState('monthly'); // 'daily', 'weekly', 'monthly'

  const fetchPortfolio = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/investor/portfolio`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
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
          <button onClick={() => refetch()} className="action-btn" style={{ background: 'var(--primary-accent)', color: '#000', margin: '0 auto' }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { Group: group, Financials: fin, Meters: meters = [], Settlements: settlements = [], RecentTransactions: recentTx = [] } = data;

  const activeMeterCount = meters.filter(m => m.status === 'Active').length;
  const totalPowerW = meters.reduce((sum, m) => sum + (Number(m.power) || 0), 0);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ── Top Header Bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem' }}>
              Cycle: {group.settlementCycle || 'Monthly'}
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

      {/* ── 12-Month Liquidation Exit Alert (When active) ──────────── */}
      {group.isReturnCapital && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '10px' }}>
              <Clock size={28} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' }}>
                12-Month Liquidation Notice Active — 10% Annual Return Rate
              </h3>
              <p style={{ color: '#e5e7eb', fontSize: '0.88rem', maxWidth: '750px', lineHeight: 1.5 }}>
                In accordance with Capital Exit Governance, the yield tier for this allocation is adjusted to <strong>10% annual return</strong>.
                At the close of the 12-month notice window, your full principal capital ({formatNaira(group.investorsCapital)}) plus the adjusted 10% yield
                will be completely settled and the account closed.
              </p>
            </div>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '12px 20px', borderRadius: '8px', textAlign: 'center', minWidth: '180px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 700 }}>
              Notice Countdown
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '2px 0' }}>
              {group.daysRemainingInExitWindow != null ? `${group.daysRemainingInExitWindow} Days` : '365 Days'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Target Liquidation: {formatNaira(group.exitCapitalAmount)}
            </div>
          </div>
        </div>
      )}

      {/* ── Metric Cards Grid ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px', marginBottom: '28px' }}>
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
            {formatNaira(fin.annualRoiMilestone)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            {group.isReturnCapital ? 'Adjusted 10% exit rate' : 'Auto-renews indefinitely every year'}
          </div>
        </div>

        {/* Card 3: Year Cash Flow Remitted */}
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
          {/* Progress Bar */}
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

        {/* Card 4: All-Time Remittance */}
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
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Settled: {formatNaira(fin.totalSettled)}</span>
            <span style={{ color: fin.pendingSettlement > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
              Accrued: {formatNaira(fin.pendingSettlement)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Cash Flow Aggregation Panel (Daily / Weekly / Monthly) ── */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={20} color="var(--primary-accent)" /> Cash Flow Aggregation & Distribution
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
              Continuous cash flow captured by the billing engine from end-user credit purchases ({group.remittanceSharePercent || 100}% share rate).
            </p>
          </div>

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
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              {cycleTab === 'daily' ? 'Today\'s Collections' : cycleTab === 'weekly' ? 'This Week\'s Collections' : 'This Month\'s Collections'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
              {formatNaira(cycleTab === 'daily' ? fin.remittedToday : cycleTab === 'weekly' ? fin.remittedWeek : fin.remittedMonth)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Directly routed to your portfolio pool
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Settlement Cadence
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
              {group.settlementCycle || 'Monthly'}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Preferred distribution schedule
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Revenue Capture Share
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
              {group.remittanceSharePercent || 100}%
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Of total meter credit top-ups
            </div>
          </div>
        </div>
      </div>

      {/* ── Portfolio Meters Fleet ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--primary-accent)" /> Deployed Infrastructure Assets ({meters.length})
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
              Meters generating continuous revenue within this investment group tab.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>● {activeMeterCount} Active</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>⚡ {totalPowerW.toFixed(0)} W Live Load</span>
          </div>
        </div>

        {meters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            No meters assigned to this group yet. As administrators assign equipment, they will automatically appear here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Meter ID</th>
                  <th style={{ padding: '10px 12px' }}>Customer / Site</th>
                  <th style={{ padding: '10px 12px' }}>Power (W)</th>
                  <th style={{ padding: '10px 12px' }}>Available Units</th>
                  <th style={{ padding: '10px 12px' }}>Total Consumed</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {meters.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#fff' }}>
                      {m.hardwareId}
                      {m.stronMeterId && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Stron: {m.stronMeterId}</span>}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {m.ownerName || 'Standard Subscriber'}
                    </td>
                    <td style={{ padding: '12px', color: '#f59e0b', fontWeight: 600 }}>
                      {Number(m.power || 0).toFixed(0)} W
                    </td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>
                      {Number(m.availableUnits || 0).toFixed(1)} kWh
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {Number(m.cumulativeKwhConsumed || 0).toFixed(1)} kWh
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: m.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: m.status === 'Active' ? '#10b981' : '#ef4444',
                          fontWeight: 600
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent End-User Credit Top-ups ─────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="var(--primary-accent)" /> Recent Remittance Cash Flows
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '18px' }}>
          Every kobo spent by end-users on energy credits captured and credited to this portfolio.
        </p>

        {recentTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            No recent payments recorded on meters in this portfolio group yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 12px' }}>Date</th>
                  <th style={{ padding: '10px 12px' }}>Meter</th>
                  <th style={{ padding: '10px 12px' }}>Customer</th>
                  <th style={{ padding: '10px 12px' }}>Gross Payment</th>
                  <th style={{ padding: '10px 12px' }}>Investor Share</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {new Date(tx.transactionDate).toLocaleDateString()} {new Date(tx.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#fff' }}>
                      {tx.hardwareId}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {tx.customerName}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                      {formatNaira(tx.grossAmount)}
                    </td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 700 }}>
                      +{formatNaira(tx.investorShareAmount)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>
                        Captured
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
