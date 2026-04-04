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
          <img src="/favicon.png" alt="LLO Logo" className="app-logo-large" />
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Join the LLO Messaging community</p>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}


        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <input
              type="text"
              name="identifier"
              required
              className="auth-input"
              placeholder="Username or Email"
              value={formData.identifier}
              onChange={handleChange}
            />
            <div className="auth-input-icon">
              <User size={20} />
            </div>
          </div>

          <div className="auth-input-group">
            <input
              type="password"
              name="password"
              required
              className="auth-input"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
            <div className="auth-input-icon">
              <Lock size={20} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            New to the app?{' '}
            <Link to="/register" className="auth-link">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
