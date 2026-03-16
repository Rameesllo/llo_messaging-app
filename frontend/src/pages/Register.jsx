import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { UserPlus, Ghost, User, Mail, Lock, Phone } from 'lucide-react';

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', phoneNumber: '' });
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
      const res = await authAPI.register(formData);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
          fontSize: '28px', 
          fontWeight: '800', 
          textAlign: 'center', 
          marginBottom: '8px',
          color: 'white'
        }}>Create Account</h1>
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
            marginBottom: '20px', 
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <User size={18} />
            </div>
            <input
              type="text"
              name="username"
              required
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              placeholder="Username"
              value={formData.username}
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
              <Mail size={18} />
            </div>
            <input
              type="email"
              name="email"
              required
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              placeholder="Email Address"
              value={formData.email}
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
              <Phone size={18} />
            </div>
            <input
              type="tel"
              name="phoneNumber"
              required
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              placeholder="Mobile Number"
              value={formData.phoneNumber}
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
              <Lock size={18} />
            </div>
            <input
              type="password"
              name="password"
              required
              style={{
                width: '100%',
                padding: '12px 16px 12px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                color: 'white',
                fontSize: '14px',
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
              padding: '14px',
              borderRadius: '14px',
              background: 'var(--sky-500)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}
            onMouseOver={(e) => e.target.style.background = 'var(--sky-600)'}
            onMouseOut={(e) => e.target.style.background = 'var(--sky-500)'}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Already a member?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'var(--sky-500)', 
                fontWeight: '700', 
                textDecoration: 'none',
                marginLeft: '4px'
              }}
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
