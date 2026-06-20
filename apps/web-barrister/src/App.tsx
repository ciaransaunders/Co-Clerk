import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@coclerk/ui';
import './index.css';

// --- Shared Components ---

const Badge = ({ type, icon, children }: any) => (
  <span className={`cc-badge ${type}`}>
    {icon && <span className="cc-badge-icon">{icon}</span>}
    {children}
  </span>
);

// --- Pages ---

const Login = () => {
  const [email, setEmail] = useState('jane.doe@hardcastle.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      login(data.token, data.user);
      navigate('/inbox');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div className="cc-full-center" style={{ padding: 20 }}>
      <div className="cc-login-card" style={{ maxWidth: '100%' }}>
        <h1 style={{ marginBottom: 8, textAlign: 'center' }}>CoClerk</h1>
        <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)', marginBottom: 32 }}>Barrister Mobile Login</p>
        
        {error && <div style={{ color: 'var(--c-status-danger)', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="cc-form-group">
            <label className="cc-label">Email Address</label>
            <input 
              className="cc-input" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="cc-form-group">
            <label className="cc-label">Password</label>
            <input 
              className="cc-input" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button className="cc-button" style={{ width: '100%', padding: 16, fontSize: 16, marginTop: 12 }}>Sign In</button>
        </form>

        <div style={{ marginTop: 32, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Quick Access (Demo)</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="cc-nav-item" style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 4, width: '100%', textAlign: 'center' }} onClick={() => setEmail('jane.doe@hardcastle.com')}>Jane Doe</span>
            <span className="cc-nav-item" style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: 4, width: '100%', textAlign: 'center' }} onClick={() => setEmail('barrister@hardcastle.com')}>Dev Barrister</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="cc-mobile-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px' }}>{location.pathname.replace('/', '').toUpperCase() || 'INBOX'}</h2>
          <p style={{ fontSize: '13px', color: 'var(--c-text-secondary)' }}>{user?.full_name}</p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--c-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
          {user?.full_name.split(' ').map(n => n[0]).join('')}
        </div>
      </header>

      <main style={{ paddingBottom: '80px' }}>
        {children}
      </main>

      <nav className="cc-bottom-nav">
        <Link to="/inbox" className={`cc-tab-item ${location.pathname === '/inbox' ? 'active' : ''}`}>
          <span className="cc-tab-icon">📥</span>
          <span>Inbox</span>
        </Link>
        <Link to="/diary" className={`cc-tab-item ${location.pathname === '/diary' ? 'active' : ''}`}>
          <span className="cc-tab-icon">📅</span>
          <span>Diary</span>
        </Link>
        <Link to="/practice" className={`cc-tab-item ${location.pathname === '/practice' ? 'active' : ''}`}>
          <span className="cc-tab-icon">📊</span>
          <span>Practice</span>
        </Link>
      </nav>
    </div>
  );
};

const Inbox = () => {
  const { token, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/workflow/pending-actions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch(e) {
      console.warn("API Error", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAction = async (id: string, response: string) => {
    await fetch(`/api/v1/workflow/barrister-response/${id}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ response })
    });
    fetchData();
  };

  return (
    <div>
      {loading && <p>Loading actions...</p>}
      {!loading && notifications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--c-text-tertiary)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>☕️</div>
          <h3>You're all caught up!</h3>
          <p style={{ fontSize: 14, marginTop: 8 }}>No pending instructions to review.</p>
          <button className="cc-button secondary" onClick={logout} style={{ marginTop: 24 }}>Logout</button>
        </div>
      )}

      {notifications.map(n => (
        <div key={n.id} className="cc-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Badge type="neutral">Instruction Offer</Badge>
            <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)' }}>Just now</span>
          </div>
          <h3 style={{ fontSize: 18, marginBottom: 8 }}>{n.payload.summary}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="cc-button" onClick={() => handleAction(n.id, 'accept')}>Accept Allocation</button>
            <button className="cc-button secondary" onClick={() => handleAction(n.id, 'decline')}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- App Root ---

const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="cc-full-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/inbox" /> : <Login />} />
      <Route path="/" element={user ? <Layout><Routes>
          <Route path="inbox" element={<Inbox />} />
          <Route path="diary" element={<div><h2>Diary</h2><p>Upcoming commitments placeholder.</p></div>} />
          <Route path="practice" element={<div><h2>Practice</h2><p>Financial stats placeholder.</p></div>} />
          <Route index element={<Navigate to="inbox" />} />
        </Routes></Layout> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
