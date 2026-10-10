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
  Award
} from 'lucide-react';
import { BASE_URL } from '../../config';

function formatNaira(val) {
  if (val == null) return '₦0';
  return '₦' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function InvestorDashboard({ handleLogout }) {
  // 'daily', 'weekly', 'monthly', 'yearly'
  const [cycleTab, setCycleTab] = useState('monthly');

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

  // Period earnings selection calculations
  let periodGross = 0;
  let periodRemitted = 0;
  let periodTitle = "This Month's Collections";

  if (cycleTab === 'daily') {
    periodGross = fin.grossToday || 0;
    periodRemitted = fin.remittedToday || 0;
    periodTitle = "Today's Collections";
  } else if (cycleTab === 'weekly') {
    periodGross = fin.grossWeek || 0;
    periodRemitted = fin.remittedWeek || 0;
    periodTitle = "This Week's Collections";
  } else if (cycleTab === 'monthly') {
    periodGross = fin.grossMonth || 0;
    periodRemitted = fin.remittedMonth || 0;
    periodTitle = "This Month's Collections";
  } else if (cycleTab === 'yearly') {
    periodGross = fin.grossYear || 0;
    periodRemitted = fin.remittedYear || 0;
    periodTitle = "Current Year Remitted (Capped)";
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
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

      {/* ─── 15% Annual Cap Notification Banner (When cap is reached) ──── */}
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
                Annual 15% Target Yield Milestone Satisfied ({formatNaira(fin.annualRoiMilestone)})
              </h3>
              <p style={{ color: '#e5e7eb', fontSize: '0.86rem', lineHeight: 1.4 }}>
                Your agreed 15% annual return of <strong>{formatNaira(fin.annualRoiMilestone)}</strong> has been completely fulfilled from customer collections.
                {fin.companySurplusYear > 0 && (
                  <span> Subsequent meter collections ({formatNaira(fin.companySurplusYear)}) are retained by IDIASCO until the next annual cycle renews.</span>
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

        {/* Card 3: Year Cash Flow Remitted (Strictly Capped at 15%) */}
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
            {fin.companySurplusYear > 0 && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                Platform Retained Surplus: {formatNaira(fin.companySurplusYear)}
              </div>
            )}
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
              <PieChart size={20} color="var(--primary-accent)" /> Cash Flow Aggregation & Distribution
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '2px' }}>
              Continuous cash flow captured by the billing engine from end-user credit purchases ({group.remittanceSharePercent || 100}% share rate).
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

        {/* Dynamic Period Metrics Breakdown */}
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
              {cycleTab === 'yearly' && fin.isCapReached ? '15% Annual Target Cap Satisfied' : 'Directly credited to your portfolio pool'}
            </div>
          </div>

          {/* Metric 2: Gross Collections from Meters in Period */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Gross Meter Top-ups ({cycleTab.toUpperCase()})
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
              {formatNaira(periodGross)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Total purchases by customers on your meters
            </div>
          </div>

          {/* Metric 3: Revenue Capture Share */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Revenue Capture Share
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
              {group.remittanceSharePercent || 100}%
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Portion routed till 15% annual ROI is achieved
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
              Meters generating continuous revenue within this investment group tab.
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
            No meters assigned to this group yet. As administrators assign equipment, they will automatically appear here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Hardware / Meter ID</th>
                  <th style={{ padding: '12px 14px' }}>Customer</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Units Avail</th>
                  <th style={{ padding: '12px 14px' }}>Prepaid Bal</th>
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
                    <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 600 }}>{formatNaira(m.prepaidNairaBalance)}</td>
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

      {/* ─── Recent Meter Remittance Cash Flows ───────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={20} color="var(--primary-accent)" /> Recent Remittance Cash Flows
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '16px' }}>
          Every kobo spent by end-users on energy credits captured and credited to this portfolio.
        </p>

        {recentTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No recent payments recorded on meters in this portfolio group yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Meter</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>Gross Payment</th>
                  <th style={{ padding: '10px 14px' }}>Capture Share</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTx.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {new Date(t.transactionDate).toLocaleDateString()} {new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fff' }}>{t.hardwareId}</td>
                    <td style={{ padding: '10px 14px', color: '#e2e8f0' }}>{t.customerName}</td>
                    <td style={{ padding: '10px 14px', color: '#fff' }}>{formatNaira(t.grossAmount)}</td>
                    <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 700 }}>{formatNaira(t.investorShareAmount)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem' }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
