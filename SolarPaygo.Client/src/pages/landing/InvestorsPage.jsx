import { Link } from 'react-router-dom';
import { 
  TrendingUp, ShieldCheck, DollarSign, PieChart, 
  BarChart2, ArrowRight, Play, ExternalLink,
  Layers, Lock
} from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './landing.css';

export default function InvestorsPage() {
  return (
    <div className="landing-page inner-page">
      <LandingNav />

      {/* Hero */}
      <section className="inner-hero">
        <div className="inner-hero-content lp-section">
          <div className="section-badge"><DollarSign size={14} /> Strategic Investment Model</div>
          <h1 className="inner-hero-title">
            Investors <span className="ac">Profitability</span> &amp; Asset Security
          </h1>
          <p className="inner-hero-sub">
            Participate in Nigeria's clean energy revolution through NISEP. Earn predictable recurring returns backed by deployed solar infrastructure, rigorous KYC screening, and automated PAYG payment collections.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary btn-lg">
              Explore Investment Packages <ArrowRight size={16} />
            </Link>
            <a 
              href="https://youtu.be/6rhW7zig0vU" 
              target="_blank" 
              rel="noreferrer"
              className="btn-secondary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Play size={16} /> Watch Investor Video Presentation
            </a>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="lp-section inner-section">
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
          <div className="section-badge green">Commercial Architecture</div>
          <h2 className="section-title">Why NISEP Delivers <span className="gr">Superior Returns</span></h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>
            Rather than relying solely on one-off equipment retail, NISEP generates recurring revenue streams through long-term energy service management and digital recharge infrastructure.
          </p>
        </div>

        <div className="lp-features-grid">
          <div className="lp-feature-card">
            <div className="lp-feature-icon"><TrendingUp size={22} /></div>
            <div className="lp-feature-title">Predictable Recurring Income</div>
            <div className="lp-feature-desc">
              Customers make scheduled prepaid PAYG payments to keep systems energized. Revenue flows directly to platform accounts with full ledger visibility.
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon"><Layers size={22} /></div>
            <div className="lp-feature-title">Multiple Revenue Streams</div>
            <div className="lp-feature-desc">
              Earnings from energy usage fees, top-up margin spreads, system upgrade packages, and structured operational and maintenance retainers.
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon"><Lock size={22} /></div>
            <div className="lp-feature-title">Asset-Backed Collateral</div>
            <div className="lp-feature-desc">
              Capital is deployed directly into physical hardware (smart inverters, high-cycle batteries, solar panels) tracked via remote telemetry and insured against damage.
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon"><ShieldCheck size={22} /></div>
            <div className="lp-feature-title">Risk Mitigation &amp; KYC</div>
            <div className="lp-feature-desc">
              Comprehensive customer verification, household income analysis, and automated switch-off controls ensure default rates remain below industry averages.
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon"><PieChart size={22} /></div>
            <div className="lp-feature-title">Scalable Portfolio Models</div>
            <div className="lp-feature-desc">
              Tailored participation models for high-net-worth private investors, corporate syndicates, and institutional infrastructure funds.
            </div>
          </div>

          <div className="lp-feature-card">
            <div className="lp-feature-icon"><BarChart2 size={22} /></div>
            <div className="lp-feature-title">Transparent Investor Portal</div>
            <div className="lp-feature-desc">
              Live access to collection statistics, system energy generation, meter status, and payout schedules through the integrated dashboard.
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholder Framework */}
      <section style={{ background: '#ffffff', padding: '90px 0', borderTop: '1px solid var(--lp-border)', borderBottom: '1px solid var(--lp-border)' }}>
        <div className="lp-section">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <div className="section-badge">Collaborative Model</div>
            <h2 className="section-title">Our Stakeholder <span className="ac">Ecosystem</span></h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              We do not view government, investors, and communities as separate entities. Our partnership model ensures mutual protection and shared value creation.
            </p>
          </div>

          <div className="page-cards-grid">
            <div className="page-card">
              <div className="page-card-tag">Capital Partners</div>
              <h3 className="page-card-title">Private &amp; Institutional Investors</h3>
              <p className="page-card-text">
                Provide capital to fund solar deployments. In return, earn transparent yields backed by insured hardware and legally binding customer service contracts.
              </p>
            </div>

            <div className="page-card">
              <div className="page-card-tag">Public Sector</div>
              <h3 className="page-card-title">Government &amp; REA</h3>
              <p className="page-card-text">
                Partner through the Electricity Act 2023 framework and Rural Electrification Agency initiatives to support national grid transition and rural electrification.
              </p>
            </div>

            <div className="page-card">
              <div className="page-card-tag">Technology &amp; Execution</div>
              <h3 className="page-card-title">IDIASCO Operations</h3>
              <p className="page-card-text">
                Handles deployment engineering, remote telemetry, payment processing, customer support, and preventive maintenance across all installed regions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video presentation highlight */}
      <section className="lp-section inner-section">
        <div className="video-banner-card">
          <div className="video-banner-info">
            <span className="section-badge"><Play size={12} /> Video Presentation</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '14px 0 12px', color: 'var(--lp-text)' }}>
              Watch the Investor Benefits Presentation
            </h2>
            <p style={{ color: 'var(--lp-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Get an in-depth walkthrough of our financial mechanics, customer recovery rates, asset-tracking protocols, and projection models.
            </p>
            <a 
              href="https://youtu.be/6rhW7zig0vU"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Watch on YouTube <ExternalLink size={15} />
            </a>
          </div>
          <div className="video-banner-media">
            <iframe 
              src="https://www.youtube.com/embed/6rhW7zig0vU" 
              title="IDIASCO NISEP Investor Presentation" 
              className="video-banner-iframe" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to Discuss <span style={{ color: 'var(--lp-accent)' }}>Investment Opportunities?</span></h2>
          <p className="lp-cta-sub">
            Our team will provide detailed pro-forma financial models, asset guarantees, and current deployment tranches.
          </p>
          <div className="lp-cta-actions">
            <Link to="/contact" className="btn-primary btn-lg">Request Investor Prospectus</Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
