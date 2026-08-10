import React, { useState } from 'react';
import { Cpu, FileText, Mic, BarChart3, GitCompare, LogOut, User, Play, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const [launchState, setLaunchState] = useState('idle');

  const handleLaunchBackend = async () => {
    setLaunchState('launching');

    try {
      const response = await fetch('/api/launch-backend', { method: 'POST' });
      const data = await response.json();

      if (data?.status === 'launching' || data?.status === 'already-running') {
        setLaunchState('ready');
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        setLaunchState('error');
      }
    } catch (error) {
      console.error('Unable to launch backend', error);
      setLaunchState('error');
    }

    setTimeout(() => setLaunchState('idle'), 3500);
  };

  return (
    <header className="glass-panel" style={{ margin: '16px 24px 0 24px', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ background: 'linear-gradient(135deg, #6366F1, #10B981)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
          <Cpu size={22} color="#FFF" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            TalentPulse <span style={{ color: '#6366F1' }}>AI</span>
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', fontWeight: '500' }}>
            Real-Time AI Mock Interview & ATS Intelligence
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', flexWrap: 'wrap' }}>
        <button
          id="nav-ats"
          className={`btn ${activeTab === 'ats' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ats')}
          style={{ padding: '7px 13px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <FileText size={15} /> ATS Checker
        </button>

        <button
          id="nav-compare"
          className={`btn ${activeTab === 'compare' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('compare')}
          style={{ padding: '7px 13px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <GitCompare size={15} /> Compare
        </button>

        <button
          id="nav-interview"
          className={`btn ${activeTab === 'interview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('interview')}
          style={{ padding: '7px 13px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <Mic size={15} /> Mock Interview
        </button>

        <button
          id="nav-analytics"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '7px 13px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <BarChart3 size={15} /> Analytics
        </button>
      </nav>

      {/* User Info + Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '10px', padding: '6px 12px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366F1, #10B981)',
            borderRadius: '50%', width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <User size={14} color="#FFF" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#E2E8F0', lineHeight: 1 }}>{user?.fullName}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{user?.email}</div>
          </div>
        </div>

        <button
          id="launch-backend-btn"
          onClick={handleLaunchBackend}
          title="Start the backend API and open Swagger"
          className="btn btn-primary"
          style={{ padding: '7px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          {launchState === 'launching' ? <Play size={15} /> : <ExternalLink size={15} />}
          {launchState === 'launching' ? 'Starting…' : launchState === 'ready' ? 'Opened' : 'Run App'}
        </button>

        <button
          id="logout-btn"
          onClick={logout}
          title="Sign out"
          className="btn btn-secondary"
          style={{ padding: '7px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px', color: '#FCA5A5' }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </header>
  );
}
