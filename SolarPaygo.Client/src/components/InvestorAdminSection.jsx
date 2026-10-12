import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  ShieldCheck,
  TrendingUp,
  Percent,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  UserCheck,
  Send,
  X,
  Award,
  CalendarCheck
} from 'lucide-react';
import { BASE_URL } from '../config';

export default function InvestorAdminSection({ formatNaira }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'short' });
  const currentYear = now.getFullYear();
  const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0);
  const daysUntilMonthEnd = Math.max(0, endOfMonth.getDate() - now.getDate());

  const fetchAdminSummary = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE_URL}/investor/admin-summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error('Failed to load investor portfolios summary.');
    }
    return res.json();
  };

  const { data: summaryList = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['investorAdminSummary'],
    queryFn: fetchAdminSummary,
    refetchInterval: 15000 // Refresh every 15s
  });

  const handleOpenPayout = (group) => {
    setSelectedGroup(group);
    // Pre-fill with the exact pending amount to prevent overpaying or underpaying!
    setPayoutAmount(group.pendingSettlement || 0);
    setPayoutRef('');
    setPayoutNotes(`${currentMonthName} remittance payout for ${group.name}`);
    setFeedbackMsg(null);
  };

  const handleRecordPayout = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;

    const amountNum = Number(payoutAmount);
    if (!amountNum || amountNum <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid payout amount.' });
      return;
    }

    if (amountNum > selectedGroup.pendingSettlement) {
      if (!window.confirm(`Warning: The payout amount (${formatNaira(amountNum)}) is higher than the current eligible due balance (${formatNaira(selectedGroup.pendingSettlement)}). Do you wish to proceed?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BASE_URL}/investor/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceGroupId: selectedGroup.id,
          amount: amountNum,
          settlementCycle: selectedGroup.settlementCycle || 'Monthly',
          reference: payoutRef.trim(),
          notes: payoutNotes.trim()
        })
      });

      if (!res.ok) {
        const errTxt = await res.text();
        throw new Error(errTxt || 'Failed to record payout settlement.');
      }

      await refetch();
      setFeedbackMsg({ type: 'success', text: `Successfully settled ${formatNaira(amountNum)} for ${selectedGroup.name}!` });
      setTimeout(() => {
        setSelectedGroup(null);
      }, 1800);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error recording payout.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated totals across all portfolios
  const totalCapital = summaryList.reduce((acc, g) => acc + (Number(g.investorsCapital) || 0), 0);
  const totalGrossRevenue = summaryList.reduce((acc, g) => acc + (Number(g.grossYear) || 0), 0);
  const totalTargetYield = summaryList.reduce((acc, g) => acc + (Number(g.annualRoiMilestone) || 0), 0);
  const totalEarnedYield = summaryList.reduce((acc, g) => acc + (Number(g.remittedYear) || 0), 0);
  const totalThisMonthYield = summaryList.reduce((acc, g) => acc + (Number(g.remittedMonth) || 0), 0);
  const totalSettled = summaryList.reduce((acc, g) => acc + (Number(g.totalSettled) || 0), 0);
  const totalPendingDue = summaryList.reduce((acc, g) => acc + (Number(g.pendingSettlement) || 0), 0);
  const totalCompanySurplus = summaryList.reduce((acc, g) => acc + (Number(g.companySurplusYear) || 0), 0);
  
  const completedPortfoliosCount = summaryList.filter(g => 
    g.isCapReached && (Number(g.pendingSettlement) || 0) <= 0 && (Number(g.totalSettled) || 0) >= (Number(g.annualRoiMilestone) || 0)
  ).length;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
        <RefreshCw size={32} className="spin-animation" style={{ color: 'var(--primary-accent)', marginBottom: '12px' }} />
        <p>Loading investor portfolio summaries & settlement ledgers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <AlertCircle size={20} /> Failed to load investor summaries
        </div>
        <p style={{ marginTop: '6px', fontSize: '0.88rem' }}>{error?.message}</p>
        <button onClick={() => refetch()} className="action-btn" style={{ marginTop: '12px' }}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* â”€â”€â”€ Top Control Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={22} color="var(--primary-accent)" /> Investor Portfolios & Month-End Payout Governance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px' }}>
            Month-end payment schedules, accurate monthly collections to pay, and full-year completion tracking.
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="action-btn" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={isFetching ? 'spin-animation' : ''} />
          <span>{isFetching ? 'Syncing...' : 'Sync Financials'}</span>
        </button>
      </div>

      {/* â”€â”€â”€ High-Level Financial Metrics Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Capital */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Investor Capital
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
            {formatNaira(totalCapital)}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '4px' }}>
            Across {summaryList.length} portfolio groups
          </div>
        </div>

        {/* Card 2: Annual Target Cap */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Annual Target Yield Cap
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
            {formatNaira(totalTargetYield)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Maximum annual investor return
          </div>
        </div>

        {/* Card 3: Generated This Month to Pay */}
        <div className="glass-panel" style={{ padding: '18px', background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
          <div style={{ fontSize: '0.76rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
            Generated This Month ({currentMonthName})
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
            {formatNaira(totalThisMonthYield)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Month-end due: {currentMonthName} {endOfMonth.getDate()}
          </div>
        </div>

        {/* Card 4: EXACT PAYOUT BALANCE DUE (CRITICAL) */}
        <div className="glass-panel" style={{ padding: '18px', background: totalPendingDue > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)', borderColor: totalPendingDue > 0 ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)' }}>
          <div style={{ fontSize: '0.76rem', color: totalPendingDue > 0 ? '#f59e0b' : 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Payout Due (Unsettled)
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalPendingDue > 0 ? '#f59e0b' : '#10b981', marginTop: '6px' }}>
            {formatNaira(totalPendingDue)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Payable to all investors now
          </div>
        </div>

        {/* Card 5: Full-Year Completed Portfolios */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            Annual Payouts Completed
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
            {completedPortfoliosCount} / {summaryList.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '4px' }}>
            100% fulfilled for {currentYear}
          </div>
        </div>

        {/* Card 6: Company Retained Surplus */}
        <div className="glass-panel" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
            IDIASCO Retained Surplus
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
            {formatNaira(totalCompanySurplus)}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Revenue above target yield cap
          </div>
        </div>
      </div>

      {/* â”€â”€â”€ Detailed Investor Portfolio Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Investor Portfolios, Monthly Earnings & Payout Schedules</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            Next Monthly Settlement: <strong>{currentMonthName} {endOfMonth.getDate()}, {currentYear}</strong>
          </span>
        </h3>

        {summaryList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
            No active device groups found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Portfolio / Group</th>
                  <th style={{ padding: '12px 14px' }}>Investor</th>
                  <th style={{ padding: '12px 14px' }}>Capital & Cap</th>
                  <th style={{ padding: '12px 14px' }}>This Month ({currentMonthName})</th>
                  <th style={{ padding: '12px 14px' }}>Year Yield (Cap)</th>
                  <th style={{ padding: '12px 14px' }}>Paid Out</th>
                  <th style={{ padding: '12px 14px' }}>NET DUE TO PAY</th>
                  <th style={{ padding: '12px 14px' }}>Payment Schedule / Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {summaryList.map(g => {
                  const isYearCompleted = g.isCapReached && (Number(g.pendingSettlement) || 0) <= 0 && (Number(g.totalSettled) || 0) >= (Number(g.annualRoiMilestone) || 0);
                  const isCapHitPending = g.isCapReached && (Number(g.pendingSettlement) || 0) > 0;

                  return (
                    <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {/* Name */}
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#fff' }}>
                        {g.name}
                        {g.meterCount > 0 ? (
                          <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'block' }}>âš¡ {g.meterCount} Meters</span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>No meters yet</span>
                        )}
                      </td>

                      {/* Investor User */}
                      <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>
                        {g.investorUsername ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.76rem' }}>
                            <UserCheck size={12} /> @{g.investorUsername}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Unlinked</span>
                        )}
                      </td>

                      {/* Capital & Cap */}
                      <td style={{ padding: '12px 14px', color: '#fff' }}>
                        <div>{formatNaira(g.investorsCapital)}</div>
                        <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>
                          Cap: {formatNaira(g.annualRoiMilestone)} ({g.roiPercentage}%)
                        </span>
                      </td>

                      {/* Generated This Month to Pay */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.96rem', fontWeight: 800, color: g.remittedMonth > 0 ? '#38bdf8' : 'var(--text-muted)' }}>
                          {formatNaira(g.remittedMonth)}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                          {g.isCapReached && g.remittedMonth === 0 ? 'Annual cap met' : `From ${formatNaira(g.grossMonth)} top-ups`}
                        </span>
                      </td>

                      {/* Year Capped Yield */}
                      <td style={{ padding: '12px 14px', color: '#a78bfa', fontWeight: 700 }}>
                        {formatNaira(g.remittedYear)}
                        {g.isCapReached && (
                          <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                            <Award size={10} /> Annual Cap Met
                          </span>
                        )}
                      </td>

                      {/* Total Settled */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                        {formatNaira(g.totalSettled)}
                      </td>

                      {/* NET DUE TO INVESTOR */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          background: g.pendingSettlement > 0 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(16, 185, 129, 0.12)',
                          color: g.pendingSettlement > 0 ? '#fbbf24' : '#10b981',
                          border: `1px solid ${g.pendingSettlement > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)'}`
                        }}>
                          {formatNaira(g.pendingSettlement)}
                        </span>
                      </td>

                      {/* Payment Schedule & Status Indicator */}
                      <td style={{ padding: '12px 14px' }}>
                        {isYearCompleted ? (
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.76rem',
                              fontWeight: 700
                            }}>
                              <CheckCircle2 size={12} /> Full Year Paid
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'block', marginTop: '2px' }}>
                              100% Settled for {currentYear}
                            </span>
                          </div>
                        ) : isCapHitPending ? (
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.76rem',
                              fontWeight: 700
                            }}>
                              <AlertCircle size={12} /> Final Balance Due
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#fbbf24', display: 'block', marginTop: '2px' }}>
                              Pay {formatNaira(g.pendingSettlement)} to close year
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.76rem',
                              fontWeight: 600
                            }}>
                              <Clock size={12} /> Due: {currentMonthName} {endOfMonth.getDate()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                              {daysUntilMonthEnd === 0 ? 'Month-end due today' : `${daysUntilMonthEnd} days remaining`}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isYearCompleted ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenPayout(g)}
                            className="action-btn"
                            style={{
                              background: g.pendingSettlement > 0 ? 'var(--primary-accent)' : 'transparent',
                              color: g.pendingSettlement > 0 ? '#000' : 'var(--text-muted)',
                              borderColor: g.pendingSettlement > 0 ? 'var(--primary-accent)' : 'var(--border-color)',
                              fontSize: '0.78rem',
                              padding: '6px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <DollarSign size={14} /> Pay Investor
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* â”€â”€â”€ Payout / Settlement Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedGroup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '28px', position: 'relative' }}>
            <button
              onClick={() => setSelectedGroup(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DollarSign size={22} color="var(--primary-accent)" /> Record Investor Payout
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px', marginBottom: '20px' }}>
              Disburse smart remittance payout to <strong>{selectedGroup.name}</strong> (@{selectedGroup.investorUsername || 'investor'}).
            </p>

            {/* Payout Summary Box */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Agreed Annual Target:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>{formatNaira(selectedGroup.annualRoiMilestone)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Generated This Month ({currentMonthName}):</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>{formatNaira(selectedGroup.remittedMonth)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Eligible Earned to Date:</span>
                <span style={{ color: '#a78bfa', fontWeight: 600 }}>{formatNaira(selectedGroup.remittedYear)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Already Settled / Paid Out:</span>
                <span style={{ color: '#fff' }}>{formatNaira(selectedGroup.totalSettled)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.95rem', fontWeight: 800 }}>
                <span style={{ color: '#fbbf24' }}>EXACT OUTSTANDING DUE:</span>
                <span style={{ color: '#fbbf24' }}>{formatNaira(selectedGroup.pendingSettlement)}</span>
              </div>
            </div>

            {feedbackMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '0.84rem',
                background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
                border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {feedbackMsg.text}
              </div>
            )}

            <form onSubmit={handleRecordPayout} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Payout Amount (â‚¦) <span style={{ color: '#fbbf24' }}>(Auto-filled to exact balance)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 700
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. BANK-TRF-20261010-001"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Notes / Audit Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. October monthly ROI remittance payout"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: '#fff',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="action-btn"
                  style={{ borderColor: 'var(--border-color)', color: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="action-btn"
                  style={{ background: 'var(--primary-accent)', color: '#000', fontWeight: 700 }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Recording...' : 'Confirm Payout'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

