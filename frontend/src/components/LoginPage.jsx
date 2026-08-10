import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, Cpu, ArrowRight, UserPlus } from 'lucide-react';

export default function LoginPage({ onSwitchToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%)'
    }}>
      <div className="glass-panel" style={{ width: '420px', padding: '40px', borderRadius: '24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ background: 'linear-gradient(135deg, #6366F1, #10B981)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <Cpu size={24} color="#FFF" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>TalentPulse <span style={{ color: '#6366F1' }}>AI</span></h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI-Powered Interview & ATS Platform</p>
          </div>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '6px' }}>Welcome back</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '28px' }}>
          Sign in to your account to continue
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            color: '#FCA5A5', fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
                color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 44px 12px 14px', borderRadius: '10px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
                  color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0
                }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? 'Signing in...' : <><LogIn size={18} /> Sign In <ArrowRight size={16} /></>}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              style={{ background: 'none', border: 'none', color: '#6366F1', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem' }}
            >
              <UserPlus size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
