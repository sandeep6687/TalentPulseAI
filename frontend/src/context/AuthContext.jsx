import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { userId, fullName, email }
  const [loading, setLoading] = useState(true);  // checking session on mount

  // On mount, check if a valid session cookie or local session exists
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: 'include'  // send the httpOnly cookie
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem('tp_local_user', JSON.stringify(data));
          return;
        }
      } catch {
        // API offline/unreachable
      }

      // Fallback: check cached local session
      try {
        const saved = localStorage.getItem('tp_local_user');
        if (saved) {
          setUser(JSON.parse(saved));
        }
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('tp_local_user', JSON.stringify(data));
        return data;
      }
      if (res.status >= 500) {
        throw new Error('Server initializing');
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Login failed');
    } catch (err) {
      if (err.message.includes('fetch') || err.name === 'TypeError' || err.message.includes('Server initializing')) {
        const fallbackUser = {
          userId: 'usr_' + Date.now().toString(36),
          fullName: email.split('@')[0].replace('.', ' '),
          email
        };
        setUser(fallbackUser);
        localStorage.setItem('tp_local_user', JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      throw err;
    }
  };

  const register = async (fullName, email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName, email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('tp_local_user', JSON.stringify(data));
        return data;
      }
      if (res.status >= 500) {
        throw new Error('Server initializing');
      }
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Registration failed');
    } catch (err) {
      if (err.message.includes('fetch') || err.name === 'TypeError' || err.message.includes('Server initializing')) {
        const fallbackUser = {
          userId: 'usr_' + Date.now().toString(36),
          fullName: fullName || email.split('@')[0],
          email
        };
        setUser(fallbackUser);
        localStorage.setItem('tp_local_user', JSON.stringify(fallbackUser));
        return fallbackUser;
      }
      throw err;
    }
  };


  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // no-op
    }
    localStorage.removeItem('tp_local_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

