import { Link } from 'react-router-dom';
import { 
  Zap, Smartphone, HeartHandshake,
  CheckCircle, ArrowRight, Play, ExternalLink, Sun
} from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './landing.css';

export default function CustomerExperiencePage() {
  return (
    <div className="landing-page inner-page">
      <LandingNav />

      {/* Hero */}
      <section className="inner-hero">
        <div className="inner-hero-content lp-section">
          <div className="section-badge green"><Zap size={14} /> Pure Energy Freedom</div>
          <h1 className="inner-hero-title">
            The <span className="gr">Customer Experience</span>: Reliable, Clean, Effortless Power
          </h1>
          <p className="inner-hero-sub">
            Say goodbye to unpredictable grid blackouts and exorbitant generator fueling expenses. NISEP gives homes, healthcare clinics, schools, and businesses 24/7 seamless clean power with flexible Pay-As-You-Go simplicity.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary btn-lg">
              Get Solar for Your Home or Business <ArrowRight size={16} />
            </Link>
            <a 
              href="https://youtu.be/fchVb5vpfxc" 
              target="_blank" 
              rel="noreferrer"
              className="btn-secondary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Play size={16} /> Watch Customer Story Video
            </a>
          </div>
        </div>
      </section>

      {/* Core Customer Benefits */}
      <section className="lp-section inner-section">
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
          <div className="section-badge">How It Transforms Your Life</div>
          <h2 className="section-title">Energy Designed Around <span className="ac">Your Needs</span></h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>
            Grid electricity when available. Renewable solar energy when additional power is required. One smart, uninterrupted experience for you and your family.
          </p>
        </div>

        <div className="page-cards-grid">
          <div className="page-card">
            <div className="page-card-icon" style={{ background: 'rgba(230,126,0,0.12)', color: 'var(--lp-accent)' }}>
              <Zap size={24} />
            </div>
            <h3 className="page-card-title">Zero Blackout Guarantee</h3>
            <p className="page-card-text">
              Automatic millisecond transfer ensures your lights, refrigeration, computers, and medical equipment never flicker during utility cuts.
            </p>
          </div>

          <div className="page-card">
            <div className="page-card-icon" style={{ background: 'rgba(10,138,96,0.12)', color: 'var(--lp-green)' }}>
              <Smartphone size={24} />
            </div>
            <h3 className="page-card-title">Convenient Mobile Top-Ups</h3>
            <p className="page-card-text">
              Recharge your meter anytime via debit card, USSD, or direct bank transfer from your mobile phone. Instant automated token activation.
            </p>
          </div>

          <div className="page-card">
            <div className="page-card-icon" style={{ background: 'rgba(30,92,191,0.12)', color: 'var(--lp-blue)' }}>
              <HeartHandshake size={24} />
            </div>
            <h3 className="page-card-title">Complete Peace of Mind</h3>
            <p className="page-card-text">
              We own the maintenance burden. Free scheduled servicing, system health monitoring, and immediate technician support whenever required.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Split with image */}
      <section style={{ background: '#ffffff', padding: '90px 0', borderTop: '1px solid var(--lp-border)', borderBottom: '1px solid var(--lp-border)' }}>
        <div className="lp-section">
          <div className="lp-about-inner">
            <div>
              <div className="section-badge green">&#8212; Smart App &amp; Real-Time Control</div>
              <h2 className="section-title">
                Monitor Every Watt.<br />
                <span className="gr">Save up to 60%</span> on Energy Bills.
              </h2>
              <p className="section-sub" style={{ marginBottom: '24px' }}>
                With rising petrol and diesel costs across Nigeria, NISEP saves small and medium enterprises hundreds of thousands of Naira every single month.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--lp-text)', fontWeight: 500 }}>
                  <CheckCircle size={18} color="var(--lp-green)" /> Silent, clean electricity &mdash; no fumes or generator noise
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--lp-text)', fontWeight: 500 }}>
                  <CheckCircle size={18} color="var(--lp-green)" /> Transparent daily consumption stats right on your phone
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--lp-text)', fontWeight: 500 }}>
                  <CheckCircle size={18} color="var(--lp-green)" /> Flexible payment tiers tailored for residential and commercial loads
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--lp-text)', fontWeight: 500 }}>
                  <CheckCircle size={18} color="var(--lp-green)" /> Long-term ownership options after completing subscription terms
                </li>
              </ul>
              <Link to="/contact" className="btn-primary">
                Check Availability in Your Area <ArrowRight size={15} />
              </Link>
            </div>

            <div>
              <img 
                src="/engineer-solar.png" 
                alt="IDIASCO Customer with Smart Solar" 
                style={{ width: '100%', borderRadius: '22px', boxShadow: 'var(--lp-shadow-lg)', border: '1px solid var(--lp-glass-border)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Video Highlight */}
      <section className="lp-section inner-section">
        <div className="video-banner-card">
          <div className="video-banner-info">
            <span className="section-badge green"><Play size={12} /> Video Experience</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '14px 0 12px', color: 'var(--lp-text)' }}>
              Watch How Customers Live with NISEP
            </h2>
            <p style={{ color: 'var(--lp-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Witness first-hand how Nigerian households and commercial business owners run uninterrupted operations with our smart energy management system.
            </p>
            <a 
              href="https://youtu.be/fchVb5vpfxc"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Watch Video <ExternalLink size={15} />
            </a>
          </div>
          <div className="video-banner-media">
            <iframe 
              src="https://www.youtube.com/embed/fchVb5vpfxc" 
              title="IDIASCO NISEP Customer Experience" 
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
          <h2 className="lp-cta-title">Upgrade Your Home or Business Today</h2>
          <p className="lp-cta-sub">
            Join thousands of satisfied Nigerians taking control of their energy destiny with IDIASCO.
          </p>
          <div className="lp-cta-actions">
            <Link to="/contact" className="btn-primary btn-lg">Request Installation Quote</Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
