import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import LandingNav from './LandingNav';
import LandingFooter from './LandingFooter';
import './landing.css';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', subject: '', message: '',
  });
  const [sent, setSent] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const { name, email, phone, subject, message } = form;
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`
    );
    const subj = encodeURIComponent(subject || 'NISEP Investment Enquiry');
    window.open(`mailto:admin@idiascosolarsystem.co.uk?subject=${subj}&body=${body}`);
    setSent(true);
    setTimeout(() => setSent(false), 6000);
  };

  return (
    <div className="contact-page">
      <LandingNav />

      {/* Hero */}
      <div className="cp-hero">
        <div className="cp-hero-inner">
          <div className="section-badge" style={{ margin: '0 auto 18px' }}>&#8212; Reach Out</div>
          <h1 className="section-title">
            Get In <span style={{ color: '#f59e0b' }}>Touch</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.72 }}>
            We&#39;d love to hear from you. Whether you&#39;re ready to invest or simply exploring options,
            our team is here to guide you every step of the way.
          </p>
        </div>
      </div>

      {/* Contact Info Cards */}
      <div className="cp-cards">
        <div className="cp-card">
          <div className="cp-card-icon"><Mail size={23} /></div>
          <div className="cp-card-label">Email Support</div>
          <div className="cp-card-value">admin@idiascosolarsystem.co.uk</div>
        </div>
        <div className="cp-card">
          <div className="cp-card-icon"><Phone size={23} /></div>
          <div className="cp-card-label">General Enquiries</div>
          <div className="cp-card-value">+234 803 295 0520</div>
        </div>
        <div className="cp-card">
          <div className="cp-card-icon"><Phone size={23} /></div>
          <div className="cp-card-label">Investment Line</div>
          <div className="cp-card-value">+441634479975</div>
        </div>
      </div>

      {/* Map + Form */}
      <div className="cp-main">

        {/* Google Map */}
        <div>
          <div className="cp-map-title">&#128205; Our Location</div>
          <p className="cp-map-sub">
            Idiasco Integrated Services Ltd &mdash; Lagos, Nigeria.
          </p>
          <div className="cp-map">
            {/*
              To set the exact office pin:
              1. Find the address in Google Maps
              2. Click Share â†’ Embed a map
              3. Replace the src below with your embed URL
            */}
            <iframe
              title="NISEP Office Location"
              src="https://maps.google.com/maps?q=Victoria+Island+Lagos+Nigeria&output=embed&z=14"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* Contact Form */}
        <div className="cp-form-card">
          <div className="cp-form-title">Send Us An Enquiry</div>
          <div className="cp-form-sub">
            Fill out the form and we&#39;ll respond within 24 hours.
          </div>

          {sent && (
            <div className="cp-form-success">
              &#10003;&nbsp; Your email client has been opened with your message. We&#39;ll reply within 24 hours!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="cp-form-row">
              <div className="cp-form-group">
                <label className="cp-form-label">Full Name *</label>
                <input
                  className="cp-form-input" type="text" required
                  placeholder="e.g. John Okafor"
                  value={form.name} onChange={set('name')}
                />
              </div>
              <div className="cp-form-group">
                <label className="cp-form-label">Email Address *</label>
                <input
                  className="cp-form-input" type="email" required
                  placeholder="your@email.com"
                  value={form.email} onChange={set('email')}
                />
              </div>
            </div>

            <div className="cp-form-row">
              <div className="cp-form-group">
                <label className="cp-form-label">Phone Number</label>
                <input
                  className="cp-form-input" type="tel"
                  placeholder="+234 800 000 0000"
                  value={form.phone} onChange={set('phone')}
                />
              </div>
              <div className="cp-form-group">
                <label className="cp-form-label">Subject</label>
                <input
                  className="cp-form-input" type="text"
                  placeholder="Investment Enquiry"
                  value={form.subject} onChange={set('subject')}
                />
              </div>
            </div>

            <div className="cp-form-group">
              <label className="cp-form-label">Message *</label>
              <textarea
                className="cp-form-textarea" required
                placeholder="Tell us about your investment goals or questions..."
                value={form.message} onChange={set('message')}
              />
            </div>

            <button type="submit" className="cp-form-submit">
              <Send size={15} /> Send Enquiry
            </button>
          </form>
        </div>

      </div>

      <LandingFooter />
    </div>
  );
}
