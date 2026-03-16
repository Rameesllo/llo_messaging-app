import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { LogIn, Ghost, Mail, Lock, User } from 'lucide-react';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(formData);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        {/* Brand Icon */}
        <div className="brand-logo-container">
          <img src="/src/assets/logo.png" alt="LLO Logo" className="app-logo-large" />
        </div>

        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '800', 
          textAlign: 'center', 
          marginBottom: '8px',
          color: 'white'
        }}>Welcome Back</h1>
        <p style={{ 
          textAlign: 'center', 
          color: 'var(--text-secondary)', 
          marginBottom: '24px',
          fontSize: '14px' 
        }}>Join the LLO Messaging community</p>
        
        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            fontSize: '14px', 
            fontWeight: '600', 
            marginBottom: '24px', 
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}


        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <User size={20} />
            </div>
            <input
              type="text"
              name="identifier"
              required
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              placeholder="Username or Email"
              value={formData.identifier}
              onChange={handleChange}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.borderColor = 'var(--sky-500)';
                e.target.parentElement.firstChild.style.color = 'var(--sky-500)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.05)';
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.parentElement.firstChild.style.color = 'var(--text-muted)';
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Lock size={20} />
            </div>
            <input
              type="password"
              name="password"
              required
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              onFocus={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.borderColor = 'var(--sky-500)';
                e.target.parentElement.firstChild.style.color = 'var(--sky-500)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.05)';
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.parentElement.firstChild.style.color = 'var(--text-muted)';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--sky-500)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginTop: '12px',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}
            onMouseOver={(e) => e.target.style.background = 'var(--sky-600)'}
            onMouseOut={(e) => e.target.style.background = 'var(--sky-500)'}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            New to the app?{' '}
            <Link 
              to="/register" 
              style={{ 
                color: 'var(--sky-500)', 
                fontWeight: '700', 
                textDecoration: 'none',
                marginLeft: '4px'
              }}
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
