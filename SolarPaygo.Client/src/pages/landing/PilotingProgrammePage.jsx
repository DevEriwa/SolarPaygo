import { Link } from 'react-router-dom';
import { 
  Box, ArrowRight, Play, ExternalLink, Cpu, Activity
} from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './landing.css';

export default function PilotingProgrammePage() {
  return (
    <div className="landing-page inner-page">
      <LandingNav />

      {/* Hero */}
      <section className="inner-hero">
        <div className="inner-hero-content lp-section">
          <div className="section-badge blue"><Cpu size={14} /> Technology &amp; Deployment Foundation</div>
          <h1 className="inner-hero-title">
            NISEP <span className="bl">Piloting Programme</span> &amp; Installation
          </h1>
          <p className="inner-hero-sub">
            From proof of concept to verified Nigerian field execution. Explore IDIASCO's working prototype environment, certified engineering standards, and roadmap for national infrastructure scale.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn-primary btn-lg">
              Partner on Pilot Deployments <ArrowRight size={16} />
            </Link>
            <a 
              href="https://youtu.be/69X8twOGUsg" 
              target="_blank" 
              rel="noreferrer"
              className="btn-secondary btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Play size={16} /> Watch 3D Project Overview
            </a>
          </div>
        </div>
      </section>

      {/* Prototype Milestones */}
      <section className="lp-section inner-section">
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
          <div className="section-badge">Proven Execution</div>
          <h2 className="section-title">Beyond Theory: A <span className="ac">Working Prototype</span></h2>
          <p className="section-sub" style={{ margin: '0 auto' }}>
            IDIASCO has progressed the NISEP concept beyond the conceptual stage into physical, live installations operating with real-time remote telemetry in Nigeria.
          </p>
        </div>

        <div className="page-cards-grid">
          <div className="page-card">
            <div className="page-card-icon" style={{ background: 'rgba(30,92,191,0.12)', color: 'var(--lp-blue)' }}>
              <Box size={24} />
            </div>
            <h3 className="page-card-title">Prototype Household Installation</h3>
            <p className="page-card-text">
              Fully operational domestic setup demonstrating dual-source grid and renewable integration under live Nigerian utility conditions.
            </p>
          </div>

          <div className="page-card">
            <div className="page-card-icon" style={{ background: 'rgba(230,126,0,0.12)', color: 'var(--lp-accent)' }}>
              <Cpu size={24} />
            </div>
            <h3 className="page-card-title">Smart Energy Management</h3>
            <p className="page-card-text">
              Hardware controllers with bi-directional communication, remote tamper sensing, and intelligent load prioritization.
            </p>
          </div>

          <div className="page-card">
            <div className="page-card-icon" style={{ background: 'rgba(10,138,96,0.12)', color: 'var(--lp-green)' }}>
              <Activity size={24} />
            </div>
            <h3 className="page-card-title">Live Telemetry &amp; Monitoring</h3>
            <p className="page-card-text">
              Cloud-based operational servers tracking kWh generation, battery state-of-charge, and payment cycle synchronisation.
            </p>
          </div>
        </div>
      </section>

      {/* 8-Stage Methodology */}
      <section style={{ background: '#ffffff', padding: '90px 0', borderTop: '1px solid var(--lp-border)', borderBottom: '1px solid var(--lp-border)' }}>
        <div className="lp-section">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <div className="section-badge">&#8212; Structured Project Delivery</div>
            <h2 className="section-title">Our 8-Stage <span className="ac">Delivery Methodology</span></h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              We mitigate operational risk by advancing every project through structured, gated development milestones.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {[
              { num: '01', title: 'Assessment', desc: 'Detailed site feasibility, commercial profiling, and customer energy demand audits.' },
              { num: '02', title: 'Engineering Design', desc: 'Precision CAD drafting, load balancing, component sizing, and safety layout plans.' },
              { num: '03', title: 'Strategic Partnership', desc: 'Engaging state agencies, local communities, and technology suppliers.' },
              { num: '04', title: 'Capital Funding', desc: 'Structuring capital allocations, insurance coverage, and disbursement schedules.' },
              { num: '05', title: 'Pilot Rollout', desc: 'Controlled batch installation, metric telemetry verification, and customer onboarding.' },
              { num: '06', title: 'Mass Deployment', desc: 'Rapid cluster installation using certified engineering teams and standard operating procedures.' },
              { num: '07', title: 'Active Operations', desc: '24/7 central NOC monitoring, SLA field dispatch, and preventive maintenance.' },
              { num: '08', title: 'National Scale', desc: 'Cross-state expansion in accordance with the Electricity Act 2023 roadmap.' }
            ].map(stage => (
              <div key={stage.num} className="page-card" style={{ padding: '24px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--lp-accent)', letterSpacing: '0.05em' }}>STAGE {stage.num}</span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '8px 0 10px', color: 'var(--lp-text)' }}>{stage.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--lp-muted)', lineHeight: 1.6 }}>{stage.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3D Overview Video Section */}
      <section className="lp-section inner-section">
        <div className="video-banner-card">
          <div className="video-banner-info">
            <span className="section-badge blue"><Play size={12} /> 3D NISEP Tour</span>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '14px 0 12px', color: 'var(--lp-text)' }}>
              Watch the 3D Project Overview Presentation
            </h2>
            <p style={{ color: 'var(--lp-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Explore the architectural rendering and physical engineering layout of our integrated mini-grid and decentralized household solar systems.
            </p>
            <a 
              href="https://youtu.be/69X8twOGUsg"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Watch 3D Overview <ExternalLink size={15} />
            </a>
          </div>
          <div className="video-banner-media">
            <iframe 
              src="https://www.youtube.com/embed/69X8twOGUsg" 
              title="IDIASCO NISEP 3D Project Overview" 
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
          <h2 className="lp-cta-title">Bring NISEP to Your Community or Estate</h2>
          <p className="lp-cta-sub">
            Whether you are a developer, estate association, or government agency, our engineering team is ready to conduct a technical feasibility survey.
          </p>
          <div className="lp-cta-actions">
            <Link to="/contact" className="btn-primary btn-lg">Request Technical Pilot Survey</Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
