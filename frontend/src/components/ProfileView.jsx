import React, { useState, useRef } from 'react';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { userAPI, mediaAPI } from '../services/api';
import { compressImage } from '../utils/imageUtils';

const ProfileView = ({ user, onClose, onUpdateUser }) => {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [profilePicture, setProfilePicture] = useState(user.profilePicture);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(file, { maxWidth: 500, maxHeight: 500, quality: 0.8 });
      const { data } = await mediaAPI.upload({ 
        file: compressedBase64, 
        resourceType: 'image' 
      });
      setProfilePicture(data.url);
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSaving(true);
    try {
      const { data } = await userAPI.updateProfile({ username, bio, profilePicture });
      onUpdateUser(data.user);
      onClose();
    } catch (err) {
      console.error('Update profile error:', err);
      alert('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <h2>My Profile</h2>
          <button 
            type="button"
            onClick={onClose}
            className="icon-btn"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {/* Avatar Edit Section */}
          <div className="avatar-edit-container">
            <div className="avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
              <img 
                src={profilePicture} 
                alt="Profile" 
                className="avatar"
              />
              <div className="avatar-overlay">
                <Camera className="text-white" size={24} style={{ color: 'white' }} />
              </div>
              {isUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: '#0ea5e9' }} />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
            <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginTop: '12px' }}>Click to change photo</p>
          </div>

          {/* Input Fields */}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input"
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea 
              className="form-input"
              value={bio} 
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              style={{ minHeight: '80px', resize: 'vertical' }}
            ></textarea>
          </div>

          <div className="btn-group">
            <button 
              type="button" 
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving || isUploading}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileView;
