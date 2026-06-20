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
  const [email, setEmail] = useState('clerk@hardcastle.com');
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
      navigate('/dashboard');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  return (
    <div className="cc-full-center">
      <div className="cc-login-card">
        <h1 style={{ marginBottom: 8, textAlign: 'center' }}>CoClerk</h1>
        <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)', marginBottom: 32 }}>Clerk Desktop Login</p>
        
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
          <button className="cc-button" style={{ width: '100%', padding: 12, marginTop: 12 }}>Sign In</button>
        </form>

        <div style={{ marginTop: 32, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Quick Access (Demo)</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="cc-nav-item" style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }} onClick={() => setEmail('director@hardcastle.com')}>Sarah (PD)</span>
            <span className="cc-nav-item" style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 4 }} onClick={() => setEmail('clerk@hardcastle.com')}>Dev Clerk</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { token, user, logout } = useAuth();
  const [intakes, setIntakes] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [intakeRes, appRes] = await Promise.all([
        fetch('/api/v1/workflow/intake', { headers }),
        fetch('/api/v1/workflow/approvals', { headers })
      ]);
      const intakeData = await intakeRes.json();
      const appData = await appRes.json();
      setIntakes(Array.isArray(intakeData) ? intakeData : []);
      setApprovals(Array.isArray(appData) ? appData : []);
    } catch(e) {
      console.warn("API Error", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const approve = async (id: string) => {
    await fetch(`/api/v1/workflow/approve-allocation/${id}`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  return (
    <div className="cc-app-layout">
      <aside className="cc-sidebar">
        <div className="cc-sidebar-header">CoClerk</div>
        <nav className="cc-sidebar-nav">
          <Link to="/dashboard" className={`cc-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
          <Link to="/intake" className={`cc-nav-item ${location.pathname === '/intake' ? 'active' : ''}`}>Instructions</Link>
          <Link to="/approvals" className={`cc-nav-item ${location.pathname === '/approvals' ? 'active' : ''}`}>Approvals ({approvals.length})</Link>
          <Link to="/matters" className={`cc-nav-item ${location.pathname === '/matters' ? 'active' : ''}`}>Matters</Link>
        </nav>
        <div style={{ padding: 24, borderTop: '1px solid #1e293b' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>{user?.full_name}</div>
          <button className="cc-button secondary" style={{ width: '100%', fontSize: 12 }} onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="cc-main">
        <div className="cc-container">
          <Routes>
            <Route path="/" element={
              <div>
                <h2>Incoming Instructions</h2>
                <p style={{marginBottom: 16, color: 'var(--c-text-secondary)'}}>Review and action incoming matters.</p>
                {loading && <p>Loading data...</p>}
                {!loading && intakes.length === 0 && (
                  <div style={{padding: 40, textAlign: 'center', color: 'var(--c-text-tertiary)', border: '1px dashed #cbd5e1', borderRadius: 8}}>
                    No pending intakes. Clear queue!
                  </div>
                )}
                {intakes.map(i => (
                  <div key={i.id} className="cc-card">
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <h4>{i.raw_subject}</h4>
                      <Badge type="warning">Review Pending</Badge>
                    </div>
                    <p style={{fontSize: 14, color: 'var(--c-text-secondary)', marginTop: 8}}>Sender: {i.raw_sender}</p>
                    <div style={{marginTop: 16, background: '#f8fafc', padding: 12, borderRadius: 4, fontSize: 13}}>
                      <strong><Badge type="ai" icon="✨">AI Extraction</Badge></strong>
                      <div style={{marginTop: 8}}>
                        <div>Type: {i.parsed_fields.case_type}</div>
                        <div>Court: {i.parsed_fields.court}</div>
                        <div>Confidence: {i.parse_confidence * 100}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            } />
            <Route path="/approvals" element={
              <div>
                <h2>High-Risk Approval Queue</h2>
                <p style={{marginBottom: 16, color: 'var(--c-text-secondary)'}}>Requires override as per Chambers Config.</p>
                {loading && <p>Loading...</p>}
                {!loading && approvals.length === 0 && <p>No pending approvals.</p>}
                {approvals.map(a => (
                  <div key={a.id} className="cc-card" style={{borderLeft: '4px solid var(--c-status-warning)'}}>
                    <h4>Allocation Decision Approval</h4>
                    <p style={{fontSize: 14, marginTop: 8}}>Action: {a.action_type}</p>
                    <div style={{marginTop: 16, display: 'flex', gap: 12}}>
                      <button className="cc-button" onClick={() => approve(a.id)}>Approve Mutation</button>
                      <button className="cc-button danger">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            } />
            <Route path="*" element={<div><h2>Feature coming soon</h2><p>Working on Phase 2-6 integrations.</p></div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// --- App Root ---

const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="cc-full-center">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
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
