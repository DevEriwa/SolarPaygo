import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun, Zap, Shield, TrendingUp, Globe, Users,
  ChevronDown, ArrowRight, Layers, BarChart2,
  RefreshCw, Lock, Wrench, Eye
} from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './landing.css';

/* ---- Counter hook ---- */
function useCountUp(target, duration, trigger) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = null;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, trigger]);
  return val;
}

/* ---- Static data ---- */
const FAQS = [
  {
    q: 'What is NISEP?',
    a: 'The Nigeria Integrated Smart Energy Programme (NISEP) is a clean energy initiative by Idiasco Integrated Services Ltd. We provide smart solar solutions through an innovative Pay-As-You-Go (PAYG) model while creating secure, high-yield investment opportunities in renewable energy infrastructure.',
  },
  {
    q: 'How does the investment process work?',
    a: 'Investors fund the deployment of solar systems, which are professionally installed for thoroughly verified residential or commercial customers. As customers make scheduled payments through our secure PAYG platform, investors earn attractive returns over the agreed investment period.',
  },
  {
    q: 'Who can invest in NISEP?',
    a: 'NISEP welcomes individual investors, businesses, corporate organisations, financial institutions, and strategic partners looking to invest in sustainable, revenue-generating energy infrastructure across Nigeria.',
  },
  {
    q: 'How are customer payments managed?',
    a: 'Customer payments are securely collected through our proprietary Pay-As-You-Go (PAYG) platform, enabling convenient instalment payments while ensuring transparent, real-time revenue management for all stakeholders.',
  },
  {
    q: 'Is my investment protected?',
    a: 'Yes. NISEP follows strict customer verification procedures, professional installation standards, remote system monitoring, routine maintenance protocols, and comprehensive insurance coverage to minimise operational risks and protect investor returns.',
  },
  {
    q: 'What types of solar systems are available?',
    a: 'NISEP offers a range of solar solutions designed for homes, small businesses, and commercial enterprises &mdash; allowing investors to select the package that best matches their financial goals and target market preferences.',
  },
  {
    q: 'How does NISEP contribute to sustainability?',
    a: "Every solar installation helps reduce Nigeria's dependence on fossil fuels, lowers carbon emissions, improves access to reliable electricity, supports local economic growth, and contributes to the nation's clean energy transition.",
  },
  {
    q: 'How can I get started?',
    a: 'Simply contact our investment team or submit an enquiry through our Contact Us page. Our experts will guide you through all available opportunities and help you choose the solution that best fits your goals and timeline.',
  },
];

const FEATURES = [
  { icon: <RefreshCw size={21} />, title: 'Smart Remote Monitoring', desc: 'Real-time visibility into every deployed system. Instant alerts, performance tracking, and remote diagnostics from a central dashboard.' },
  { icon: <Zap size={21} />, title: 'PAYG Payment Platform', desc: 'Our secure prepaid metering system ensures customers pay only for what they use, and investors receive transparent, predictable revenue.' },
  { icon: <Shield size={21} />, title: 'Verified Customer Screening', desc: 'Every customer undergoes a rigorous KYC verification process before system deployment, minimising default risk at source.' },
  { icon: <Lock size={21} />, title: 'Insurance Protection', desc: 'Systems are backed by comprehensive insurance coverage, protecting both hardware investment and long-term income streams.' },
  { icon: <Wrench size={21} />, title: 'Professional Installation', desc: 'Certified engineers handle every installation to international standards, ensuring maximum system performance and longevity.' },
  { icon: <Eye size={21} />, title: 'Transparent Performance Tracking', desc: 'Investors receive regular, detailed reports on system performance, payment collection rates, and cumulative returns.' },
];

const WHY = [
  { icon: <TrendingUp size={19} />, num: '01', title: 'Attractive Returns', desc: 'Generate sustainable income through an innovative renewable energy model designed for consistent, long-term yield with minimal overhead.' },
  { icon: <Globe size={19} />, num: '02', title: 'Growing Market', desc: "Nigeria's escalating electricity demand creates significant opportunities for expansion, increasing adoption, and growing investor returns." },
  { icon: <Layers size={19} />, num: '03', title: 'Real Asset Backing', desc: 'Every investment is backed by deployed solar infrastructure serving verified customers &mdash; tangible, physical assets you can track.' },
  { icon: <BarChart2 size={19} />, num: '04', title: 'Smart Monitoring', desc: 'Advanced monitoring technology enables real-time performance tracking, enabling operational efficiency and rapid issue resolution.' },
  { icon: <RefreshCw size={19} />, num: '05', title: 'Scalable Platform', desc: 'Engineered to scale from local communities to nationwide deployment without compromising service quality or investor transparency.' },
  { icon: <Users size={19} />, num: '06', title: 'Positive Social Impact', desc: 'Support clean energy adoption while improving lives, creating local jobs, and actively reducing Nigeria\'s carbon footprint.' },
];

/* ---- Component ---- */
export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState(null);
  const [statsOn, setStatsOn] = useState(false);
  const statsRef = useRef(null);

  /* Scroll animation observer */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            if (e.target === statsRef.current) setStatsOn(true);
          }
        });
      },
      { threshold: 0.14 }
    );
    document.querySelectorAll('.aos').forEach((el) => obs.observe(el));
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  /* Animated counters */
  const cSystems     = useCountUp(150,  2300, statsOn);
  const cRevenue     = useCountUp(500,  2300, statsOn);
  const cCommunities = useCountUp(35,   2300, statsOn);
  const cUptime      = useCountUp(99,   2300, statsOn);

  const toggleFaq = (i) => setFaqOpen(faqOpen === i ? null : i);

  return (
    <div className="landing-page">
      <LandingNav />

      {/* ======================================================
          HERO
      ====================================================== */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-orb lp-hero-orb-a" />
        <div className="lp-hero-orb lp-hero-orb-b" />

        <div className="lp-hero-content">
          <div className="lp-hero-eyebrow">
            <Zap size={11} /> IDIASCO INTEGRATED SERVICE &bull; NISEP SOLAR PAYGO
          </div>

          <h1 className="lp-hero-title">
            Power Nigeria&apos;s Future.<br />
            <span style={{ color: '#f59e0b' }}>Build Sustainable Wealth.</span><br />
            With <span style={{ color: '#10b981' }}>Idiasco Solar</span>
          </h1>

          <p className="lp-hero-desc">
            <strong>Idiasco Integrated Services Ltd</strong> delivers reliable, smart Pay-As-You-Go solar
            solutions that illuminate homes and businesses across Nigeria &mdash; while providing investors
            with transparent, high-yield renewable energy assets.
          </p>

          <div className="lp-hero-actions">
            <Link to="/contact" className="btn-primary btn-lg">
              Book a Free Strategy Call <ArrowRight size={15} />
            </Link>
            <button
              className="btn-secondary btn-lg"
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See What We Build
            </button>
          </div>

          {/* Stats bar &mdash; triggers counters when visible */}
          <div className="lp-hero-stats" ref={statsRef}>
            <div className="lp-stat">
              <div className="lp-stat-num">{cSystems}<span className="ac">+</span></div>
              <div className="lp-stat-label">Systems Deployed</div>
            </div>
            <div className="lp-stat-div" />
            <div className="lp-stat">
              <div className="lp-stat-num">&#8358;{cRevenue}<span className="ac">M+</span></div>
              <div className="lp-stat-label">Revenue Generated</div>
            </div>
            <div className="lp-stat-div" />
            <div className="lp-stat">
              <div className="lp-stat-num">{cCommunities}<span className="ac">+</span></div>
              <div className="lp-stat-label">Communities Powered</div>
            </div>
            <div className="lp-stat-div" />
            <div className="lp-stat">
              <div className="lp-stat-num">{cUptime}<span className="ac">%</span></div>
              <div className="lp-stat-label">System Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          ABOUT
      ====================================================== */}
      <section id="about" className="lp-about">
        <div className="lp-about-inner">
          <div>
            <div className="aos">
              <div className="section-badge">&#8212; About Idiasco Integrated Service</div>
              <h2 className="section-title">
                Reliable Energy.<br />
                <span className="gr">Sustainable Future.</span>
              </h2>
              <p className="section-sub">
                At <strong>Idiasco Integrated Services Ltd</strong>, we believe uninterrupted power is essential
                for Nigeria&apos;s economic growth. Through our flagship <strong>NISEP (Nigeria Integrated Smart Energy Programme)</strong>,
                we deliver engineered solar installations, IoT smart metering, and seamless Pay-As-You-Go technology
                that empower communities, strengthen enterprises, and generate long-term value for investors.
              </p>
            </div>
            <div className="lp-badges aos d2">
              {[
                ['&#9889;', 'Smart Solar Infrastructure'],
                ['&#128274;', 'Secure Investment Opportunities'],
                ['&#128161;', 'Flexible PAYG Technology'],
                ['&#127757;', 'Nationwide Expansion Strategy'],
              ].map(([icon, label]) => (
                <div className="lp-badge" key={label}>
                  <span className="lp-badge-icon" dangerouslySetInnerHTML={{ __html: icon }} />
                  <span className="lp-badge-text">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Animated dashboard card */}
          <div className="lp-about-card aos d3">
            <div className="lp-about-card-header">
              <div className="lp-about-card-icon"><Sun size={18} /></div>
              <div>
                <div className="lp-about-card-title">Idiasco NISEP Platform</div>
                <div className="lp-about-card-sub">Live Performance Dashboard</div>
              </div>
              <div className="lp-about-live">&#11044; LIVE</div>
            </div>

            {[
              { label: 'Energy Output Efficiency', value: '94%', fill: 94 },
              { label: 'Payment Collection Rate',  value: '97%', fill: 97 },
              { label: 'Customer Satisfaction',    value: '98%', fill: 98 },
              { label: 'System Uptime',            value: '99%', fill: 99 },
            ].map((m) => (
              <div className="lp-metric" key={m.label}>
                <div className="lp-metric-row">
                  <span className="lp-metric-label">{m.label}</span>
                  <span className="lp-metric-val">{m.value}</span>
                </div>
                <div className="lp-metric-bar">
                  <div
                    className="lp-metric-fill"
                    style={{ width: statsOn ? `${m.fill}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}
      <section id="how" className="lp-how">
        <div className="lp-how-header aos">
          <div className="section-badge" style={{ margin: '0 auto 18px' }}>&#8212; Our Process</div>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            How <span className="ac">NISEP</span> Works
          </h2>
          <p className="section-sub" style={{ margin: '0 auto', textAlign: 'center' }}>
            Our streamlined investment model makes it simple to participate in Nigeria&#39;s clean
            energy transition and generate consistent returns.
          </p>
        </div>

        <div className="lp-how-steps">
          {[
            {
              num: '01', icon: <TrendingUp size={21} />, title: 'Invest',
              desc: 'Select a package that matches your financial goals. Your investment funds deployment of high-quality, certified solar systems across Nigeria.',
            },
            {
              num: '02', icon: <Wrench size={21} />, title: 'Deploy',
              desc: 'Our certified technical team professionally installs the system for carefully verified residential or commercial customers using our secure deployment process.',
            },
            {
              num: '03', icon: <Zap size={21} />, title: 'Generate Revenue',
              desc: 'Customers make affordable monthly payments through our Pay-As-You-Go platform while enjoying uninterrupted, clean energy supply every day.',
            },
            {
              num: '04', icon: <BarChart2 size={21} />, title: 'Earn Returns',
              desc: 'As customer payments are received, investors generate attractive returns throughout the investment cycle &mdash; predictable, transparent, and sustainable.',
            },
          ].map((s, i) => (
            <div key={s.num} className={`lp-step aos d${i + 1}`}>
              <div className="lp-step-num">{s.num}</div>
              <div className="lp-step-icon">{s.icon}</div>
              <div className="lp-step-title">{s.title}</div>
              <div className="lp-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================
          PLATFORM FEATURES
      ====================================================== */}
      <section id="features" className="lp-features">
        <div className="lp-section">
          <div className="lp-features-header aos">
            <div className="section-badge green" style={{ margin: '0 auto 18px' }}>&#8212; Platform Capabilities</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>
              Powering Smart Energy<br />
              <span className="ac">with Confidence</span>
            </h2>
            <p className="section-sub" style={{ margin: '0 auto', textAlign: 'center' }}>
              Built on advanced technology and industry best practices to ensure maximum reliability,
              security, and transparency for investors and customers alike.
            </p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`lp-feature-card aos d${(i % 3) + 1}`}>
                <div className="lp-feature-icon">{f.icon}</div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          WHY CHOOSE NISEP
      ====================================================== */}
      <section id="why" className="lp-why">
        <div className="lp-section">
          <div className="lp-why-header aos">
            <div className="section-badge" style={{ margin: '0 auto 18px' }}>&#8212; Why NISEP</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>
              Why Investors Choose<br />
              <span className="ac">NISEP</span>
            </h2>
            <p className="section-sub" style={{ margin: '0 auto', textAlign: 'center' }}>
              Six compelling reasons to join Nigeria&#39;s most dynamic clean energy investment platform.
            </p>
          </div>
          <div className="lp-why-grid">
            {WHY.map((w, i) => (
              <div key={w.num} className={`lp-why-card aos d${(i % 3) + 1}`}>
                <div className="lp-why-num">{w.num}</div>
                <div className="lp-why-icon">{w.icon}</div>
                <div className="lp-why-title">{w.title}</div>
                <div className="lp-why-desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          FEATURED VIDEO PRESENTATIONS & DEMONSTRATIONS
      ====================================================== */}
      <section id="videos" style={{ padding: '110px 0', borderTop: '1px solid var(--lp-border)', background: '#ffffff' }}>
        <div className="lp-section">
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto 50px' }} className="aos">
            <div className="section-badge" style={{ margin: '0 auto 18px' }}>&#8212; Video Demonstrations</div>
            <h2 className="section-title">
              Watch NISEP in <span className="ac">Action</span>
            </h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              Explore our project video presentations, customer stories, and 3D engineering models illustrating the deployment of smart pay-as-you-go solar systems in Nigeria.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* Video 1: Investors */}
            <div className="page-card aos d1" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0f172a' }}>
                <iframe
                  src="https://www.youtube.com/embed/6rhW7zig0vU"
                  title="NISEP Investor Profitability Presentation"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="page-card-tag">Strategic Investment</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--lp-text)', marginBottom: '8px' }}>
                  Investor Profitability &amp; Asset Security
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--lp-muted)', lineHeight: 1.6, marginBottom: '20px', flex: 1 }}>
                  A comprehensive walkthrough of financial yields, asset-backed collateral, risk mitigation, and returns from the PAYG model.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--lp-border)' }}>
                  <Link to="/investors" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--lp-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    Read Full Model <ArrowRight size={14} />
                  </Link>
                  <a href="https://youtu.be/6rhW7zig0vU" target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--lp-muted)', textDecoration: 'none' }}>
                    Open Video &#8599;
                  </a>
                </div>
              </div>
            </div>

            {/* Video 2: Customer Experience */}
            <div className="page-card aos d2" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0f172a' }}>
                <iframe
                  src="https://www.youtube.com/embed/fchVb5vpfxc"
                  title="NISEP Customer Experience Story"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="page-card-tag" style={{ color: 'var(--lp-green)' }}>Customer Experience</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--lp-text)', marginBottom: '8px' }}>
                  Reliable Power &amp; Mobile Simplicity
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--lp-muted)', lineHeight: 1.6, marginBottom: '20px', flex: 1 }}>
                  How Nigerian homes and businesses enjoy 24/7 uninterrupted power with smart prepaid metering and seamless top-ups.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--lp-border)' }}>
                  <Link to="/customer-experience" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--lp-green)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    Read Customer Story <ArrowRight size={14} />
                  </Link>
                  <a href="https://youtu.be/fchVb5vpfxc" target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--lp-muted)', textDecoration: 'none' }}>
                    Open Video &#8599;
                  </a>
                </div>
              </div>
            </div>

            {/* Video 3: 3D Piloting Overview */}
            <div className="page-card aos d3" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#0f172a' }}>
                <iframe
                  src="https://www.youtube.com/embed/69X8twOGUsg"
                  title="NISEP 3D Project Overview & Prototype"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="page-card-tag" style={{ color: 'var(--lp-blue)' }}>3D Project Tour</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--lp-text)', marginBottom: '8px' }}>
                  3D Engineering &amp; Field Prototype
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--lp-muted)', lineHeight: 1.6, marginBottom: '20px', flex: 1 }}>
                  Take a 3D architectural tour of the physical solar deployment, smart inverter layout, and live telemetry infrastructure.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid var(--lp-border)' }}>
                  <Link to="/piloting-programme" style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--lp-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    Explore Prototype <ArrowRight size={14} />
                  </Link>
                  <a href="https://youtu.be/69X8twOGUsg" target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: 'var(--lp-muted)', textDecoration: 'none' }}>
                    Open Video &#8599;
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          FAQ
      ====================================================== */}
      <section id="faq" className="lp-faq">
        <div className="lp-faq-inner">
          <div className="lp-faq-header aos">
            <div className="section-badge" style={{ margin: '0 auto 18px' }}>&#8212; Questions &amp; Answers</div>
            <h2 className="section-title" style={{ textAlign: 'center' }}>
              Straight <span className="ac">Answers</span>
            </h2>
            <p className="section-sub" style={{ margin: '0 auto', textAlign: 'center' }}>
              Everything you need to know about investing with NISEP, our PAYG solar solutions,
              and the benefits of joining our programme.
            </p>
          </div>

          <div className="lp-faq-list aos d2">
            {FAQS.map((faq, i) => (
              <div key={i} className={`lp-faq-item${faqOpen === i ? ' open' : ''}`}>
                <div className="lp-faq-q" onClick={() => toggleFaq(i)} role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleFaq(i)}>
                  <span className="lp-faq-q-text">{faq.q}</span>
                  <ChevronDown size={17} className="lp-faq-chevron" />
                </div>
                <div className="lp-faq-a">
                  <p className="lp-faq-a-text">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================
          CTA BANNER
      ====================================================== */}
      <section className="lp-cta">
        <div className="lp-cta-bg" />
        <div className="lp-cta-inner aos">
          <div className="section-badge" style={{ margin: '0 auto 22px' }}>&#8212; Get Started Today</div>
          <h2 className="lp-cta-title">
            Ready to <span style={{ color: '#f59e0b' }}>Invest</span> in<br />
            Nigeria&#39;s Energy Future?
          </h2>
          <p className="lp-cta-sub">
            Join visionary investors already generating sustainable returns through Nigeria&#39;s most
            innovative clean energy platform. Book your free, no-obligation strategy call today.
          </p>
          <div className="lp-cta-actions">
            <Link to="/contact" className="btn-primary btn-lg">
              Book Free Strategy Call <ArrowRight size={15} />
            </Link>
            <button
              className="btn-secondary btn-lg"
              onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn How It Works
            </button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
