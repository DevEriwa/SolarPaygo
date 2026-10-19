import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import './landing.css';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isInner = location.pathname !== '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      window.location.href = '/#' + id;
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <nav className={`lp-nav${scrolled || isInner ? ' scrolled' : ''}${isInner ? ' inner-nav' : ''}`}>
        <Link to="/" className="lp-nav-logo">
          <div className="lp-nav-logo-badge">
            <img src="/idiasco-logo.png" alt="IDIASCO Integrated Service" className="lp-nav-logo-img" />
          </div>
          <div className="lp-nav-brand-text">
            <span className="lp-nav-brand-title">IDIASCO</span>
            <span className="lp-nav-brand-sub">SOLAR PAYGO</span>
          </div>
        </Link>

        <ul className="lp-nav-links">
          <li><Link to="/" className={`lp-nav-link${location.pathname === '/' ? ' active-link' : ''}`}>Home</Link></li>
          <li><button className="lp-nav-link" onClick={() => scrollTo('about')}>About Us</button></li>
          <li><Link to="/investors" className={`lp-nav-link${location.pathname === '/investors' ? ' active-link' : ''}`}>Investors</Link></li>
          <li><Link to="/customer-experience" className={`lp-nav-link${location.pathname === '/customer-experience' ? ' active-link' : ''}`}>Customer Experience</Link></li>
          <li><Link to="/piloting-programme" className={`lp-nav-link${location.pathname === '/piloting-programme' ? ' active-link' : ''}`}>Piloting &amp; Installation</Link></li>
          <li><button className="lp-nav-link" onClick={() => scrollTo('faq')}>FAQ</button></li>
          <li><Link to="/contact" className={`lp-nav-link${location.pathname === '/contact' ? ' active-link' : ''}`}>Contact</Link></li>
        </ul>

        <div className="lp-nav-cta">
          <Link to="/login" className="btn-primary lp-nav-login-btn">
            Login <ArrowRight size={13} />
          </Link>
        </div>

        <button className="lp-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`lp-mobile-menu${mobileOpen ? ' open' : ''}`}>
        <button className="lp-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X size={28} />
        </button>
        <Link to="/" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Home</Link>
        <button className="lp-mobile-link" onClick={() => scrollTo('about')}>About Us</button>
        <Link to="/investors" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Investors Profitability</Link>
        <Link to="/customer-experience" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Customer Experience</Link>
        <Link to="/piloting-programme" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Piloting &amp; Installation</Link>
        <button className="lp-mobile-link" onClick={() => scrollTo('faq')}>FAQ</button>
        <Link to="/contact" className="lp-mobile-link" onClick={() => setMobileOpen(false)}>Contact Us</Link>
        <Link to="/login" className="btn-primary btn-lg" style={{ marginTop: '16px' }} onClick={() => setMobileOpen(false)}>
          Login Portal <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
