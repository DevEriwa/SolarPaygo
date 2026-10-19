import { Link } from 'react-router-dom';
import { Sun, Mail, Phone, MapPin } from 'lucide-react';

export default function LandingFooter() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-top">

          {/* Brand */}
          <div>
            <Link to="/" className="lp-footer-logo">
              <div className="lp-footer-logo-badge">
                <img src="/idiasco-logo.png" alt="IDIASCO Integrated Service" className="lp-footer-logo-img" />
              </div>
            </Link>
            <p className="lp-footer-desc">
              <strong>Idiasco Integrated Services Ltd</strong> &mdash; Reliable Energy. Sustainable Future.
              Empowering homes, businesses, and communities across Nigeria with smart, sustainable solar solutions
              through the NISEP Solar Pay-As-You-Go platform.
            </p>
            <div className="lp-footer-socials">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="lp-footer-social" aria-label="Facebook">
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="lp-footer-social" aria-label="YouTube">
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="lp-footer-social" aria-label="LinkedIn">
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="lp-footer-col-title">Quick Links</div>
            <ul className="lp-footer-links">
              <li><button onClick={() => scrollTo('about')}>About Us</button></li>
              <li><button onClick={() => scrollTo('how')}>How It Works</button></li>
              <li><button onClick={() => scrollTo('why')}>Why NISEP</button></li>
              <li><button onClick={() => scrollTo('faq')}>FAQ</button></li>
              <li><Link to="/contact">Contact Us</Link></li>
              <li><Link to="/login">Login to Platform</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="lp-footer-col-title">Company</div>
            <ul className="lp-footer-links">
              <li><button onClick={() => scrollTo('about')}>Our Mission</button></li>
              <li><button onClick={() => scrollTo('features')}>Platform Features</button></li>
              <li><Link to="/contact">Investment Packages</Link></li>
              <li><Link to="/contact">Partner With Us</Link></li>
            </ul>
          </div>

          {/* Contact + Newsletter */}
          <div>
            <div className="lp-footer-col-title">Contact</div>
            <div className="lp-footer-contact">
              <Mail size={13} /><span>admin@idiascosolarsystem.co.uk</span>
            </div>
            <div className="lp-footer-contact">
              <Phone size={13} /><span>+234 803 295 0520</span>
            </div>
            <div className="lp-footer-contact">
              <Phone size={13} /><span>+441634479975</span>
            </div>
            <div className="lp-footer-contact">
              <MapPin size={13} /><span>Lagos, Nigeria</span>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div className="lp-footer-col-title" style={{ marginBottom: '10px' }}>Newsletter</div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px', lineHeight: 1.6 }}>
                Stay informed about NISEP energy opportunities.
              </p>
              <div className="lp-newsletter-form">
                <input className="lp-newsletter-input" type="email" placeholder="Your email address" />
                <button className="lp-newsletter-btn">Join</button>
              </div>
            </div>
          </div>

        </div>
        <div className="lp-footer-divider" />
        <div className="lp-footer-bottom">
          <div className="lp-footer-copy">
            Copyright &copy; {new Date().getFullYear()} Idiasco Integrated Services Ltd. All rights reserved.
          </div>
          <div className="lp-footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
