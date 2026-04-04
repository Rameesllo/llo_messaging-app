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
          <img src="/favicon.png" alt="LLO Logo" className="app-logo-large" />
        </div>

        <h1 className="auth-title">Create Account</h1>
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
              name="username"
              required
              className="auth-input"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
            />
            <div className="auth-input-icon">
              <User size={18} />
            </div>
          </div>

          <div className="auth-input-group">
            <input
              type="email"
              name="email"
              required
              className="auth-input"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
            />
            <div className="auth-input-icon">
              <Mail size={18} />
            </div>
          </div>

          <div className="auth-input-group">
            <input
              type="tel"
              name="phoneNumber"
              required
              className="auth-input"
              placeholder="Mobile Number"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
            <div className="auth-input-icon">
              <Phone size={18} />
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
              <Lock size={18} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already a member?{' '}
            <Link to="/login" className="auth-link">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
