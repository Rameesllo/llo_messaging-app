import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { Calendar, ChevronRight, Check, Mars, Venus, UserCircle, ArrowLeft } from 'lucide-react';

const Onboarding = ({ user, setUser }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 1 && !formData.dateOfBirth) return;
    if (step === 2 && !formData.gender) return;
    
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userAPI.updateProfile({
        ...formData,
        onboardingCompleted: true
      });
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      console.error('Onboarding failed:', err);
      setError(err.response?.data?.message || 'Failed to save details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { label: 'Male', icon: <Mars size={24} />, color: '#0ea5e9' },
    { label: 'Female', icon: <Venus size={24} />, color: '#f472b6' },
    { label: 'Other', icon: <UserCircle size={24} />, color: '#94a3b8' },
    { label: 'Skip', icon: <Check size={24} />, color: '#64748b' }
  ];

  return (
    <div className="auth-container">
      <div className="glass-card" style={{ maxWidth: '480px' }}>
        {/* Header with Back Button and Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)} 
              className="icon-btn"
              style={{ padding: '4px', background: 'rgba(255,255,255,0.05)' }}
            >
              <ArrowLeft size={20} />
            </button>
          ) : <div style={{ width: '28px' }} />}
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2].map(s => (
              <div key={s} style={{ 
                width: '40px', 
                height: '4px', 
                borderRadius: '2px',
                background: s <= step ? 'var(--sky-500)' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>
          
          <div style={{ width: '28px' }} />
        </div>

        <div className="brand-logo-container" style={{ marginBottom: '40px' }}>
          <img src="/favicon.png" alt="LLO Logo" className="app-logo" style={{ width: '80px', height: '80px' }} />
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#f87171', 
            padding: '12px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div style={{ animation: 'stepEnter 0.4s ease-out' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', textAlign: 'center', color: 'var(--text-primary)' }}>
              When's your birthday? 🎂
            </h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '40px', fontSize: '15px' }}>
              We'll use this to show your age on your profile.
            </p>
            
            <div className="form-group" style={{ marginBottom: '40px' }}>
              <label className="form-label">Date of Birth</label>
              <div style={{ position: 'relative' }}>
                <Calendar style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                <input 
                  type="date" 
                  className="form-input"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  style={{ paddingLeft: '52px', fontSize: '16px' }}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'stepEnter 0.4s ease-out' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', textAlign: 'center', color: 'var(--text-primary)' }}>
              What's your gender? ✨
            </h1>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '40px', fontSize: '15px' }}>
              Pick what best describes you.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '40px' }}>
              {categories.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => setFormData({ ...formData, gender: cat.label })}
                  className="gender-option-btn"
                  style={{
                    padding: '24px 16px',
                    borderRadius: '20px',
                    border: '2px solid',
                    borderColor: formData.gender === cat.label ? cat.color : 'rgba(255, 255, 255, 0.05)',
                    background: formData.gender === cat.label ? `${cat.color}20` : 'rgba(255, 255, 255, 0.03)',
                    color: formData.gender === cat.label ? 'white' : 'var(--text-secondary)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ 
                    color: formData.gender === cat.label ? cat.color : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}>
                    {cat.icon}
                  </div>
                  <span style={{ fontSize: '14px' }}>{cat.label}</span>
                  {formData.gender === cat.label && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                      <Check size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={loading || (step === 1 && !formData.dateOfBirth) || (step === 2 && !formData.gender)}
          onClick={handleNext}
          className="btn btn-primary"
          style={{
            padding: '18px',
            borderRadius: '20px',
            fontSize: '16px',
            boxShadow: '0 8px 25px rgba(14, 165, 233, 0.25)',
            opacity: (loading || (step === 1 && !formData.dateOfBirth) || (step === 2 && !formData.gender)) ? 0.3 : 1
          }}
        >
          {loading ? (
            <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '3px' }}></div>
          ) : (
            <>
              {step === 2 ? 'Let\'s Go!' : 'Continue'}
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes stepEnter {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .gender-option-btn:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .gender-option-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
