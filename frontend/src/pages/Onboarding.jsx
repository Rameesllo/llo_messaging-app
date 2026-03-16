import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { Ghost, Calendar, Users, ChevronRight, Check } from 'lucide-react';

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
    console.log('Onboarding step:', step, 'Data:', formData);
    if (step === 1 && !formData.dateOfBirth) {
      console.warn('Birthday missing');
      return;
    }
    if (step === 2 && !formData.gender) {
      console.warn('Gender missing');
      return;
    }
    
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    console.log('Submitting onboarding...', formData);
    try {
      const res = await userAPI.updateProfile({
        ...formData,
        onboardingCompleted: true
      });
      console.log('Onboarding success:', res.data);
      setUser(res.data.user);
      navigate('/');
    } catch (err) {
      console.error('Onboarding failed:', err);
      setError(err.response?.data?.message || 'Failed to save details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Male', 'Female', 'Other', 'Prefer not to say'];

  return (
    <div className="auth-container" style={{ background: '#FFFC00' }}>
      <div className="glass-card" style={{ 
        background: 'white', 
        color: 'black', 
        borderRadius: '32px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', justifyContent: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ 
              width: '40px', 
              height: '4px', 
              borderRadius: '2px',
              background: s <= step ? '#000' : '#e2e8f0',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        <div className="brand-logo-container">
          <img src="/src/assets/logo.png" alt="LLO Logo" className="app-logo-large" />
        </div>

        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#dc2626', 
            padding: '12px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center',
            fontWeight: '600',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', textAlign: 'center' }}>When's your birthday?</h1>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px' }}>This helps us provide the right experience.</p>
            
            <div style={{ position: 'relative', marginBottom: '40px' }}>
              <Calendar style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={20} />
              <input 
                type="date" 
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 52px',
                  borderRadius: '16px',
                  border: '2px solid #f1f5f9',
                  fontSize: '16px',
                  fontWeight: '600',
                  outline: 'none',
                  background: '#f8fafc'
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '12px', textAlign: 'center' }}>What's your gender?</h1>
            <p style={{ color: '#64748b', textAlign: 'center', marginBottom: '32px' }}>Choose how you'd like to be identified.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '40px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFormData({ ...formData, gender: cat })}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    border: '2px solid',
                    borderColor: formData.gender === cat ? '#0ea5e9' : '#f1f5f9',
                    background: formData.gender === cat ? '#f0f9ff' : 'white',
                    color: formData.gender === cat ? '#0369a1' : '#1e293b',
                    fontWeight: '700',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                  {formData.gender === cat && <Check size={20} />}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={loading || (step === 1 && !formData.dateOfBirth) || (step === 2 && !formData.gender)}
          onClick={handleNext}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '20px',
            background: '#000',
            color: 'white',
            fontSize: '16px',
            fontWeight: '800',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            opacity: (loading || (step === 1 && !formData.dateOfBirth) || (step === 2 && !formData.gender)) ? 0.5 : 1
          }}
        >
          {loading ? 'Setting up...' : (step === 2 ? 'Finish' : 'Continue')}
          {!loading && <ChevronRight size={20} />}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
