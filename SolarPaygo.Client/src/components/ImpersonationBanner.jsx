import React from 'react';
import { EyeOff, ArrowLeftCircle } from 'lucide-react';

export default function ImpersonationBanner({ role, target, onExit }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '42px',
      background: 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 99999,
      boxShadow: '0 3px 12px rgba(0,0,0,0.45)',
      fontSize: '0.85rem',
      fontWeight: '600'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <EyeOff size={18} style={{ color: '#fbbf24' }} />
        <span>GHOST MODE ACTIVE &bull; Viewing as <strong style={{ textDecoration: 'underline', color: '#fef08a' }}>{role}</strong> ({target || 'Target User'})</span>
        <span style={{ fontSize: '0.72rem', opacity: 0.9, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '100px' }}>
          Stealth Impersonation
        </span>
      </div>

      <button
        onClick={onExit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#ffffff',
          borderRadius: '6px',
          padding: '4px 12px',
          fontSize: '0.8rem',
          fontWeight: '700',
          cursor: 'pointer'
        }}
      >
        <ArrowLeftCircle size={15} /> Exit Impersonation & Return to SuperAdmin
      </button>
    </div>
  );
}
