import React, { useState, useEffect } from 'react';
import { X, Loader2, User } from 'lucide-react';
import { userAPI } from '../services/api';

const MutualFriendsModal = ({ otherUserId, onClose }) => {
  const [mutualFriends, setMutualFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMutual = async () => {
      try {
        const { data } = await userAPI.getMutualFriends(otherUserId);
        setMutualFriends(data);
      } catch (err) {
        console.error('Failed to fetch mutual friends:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMutual();
  }, [otherUserId]);

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} className="text-sky-500" />
            <h2 style={{ fontSize: '18px' }}>Mutual Friends</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin" size={24} color="#0ea5e9" />
            </div>
          ) : mutualFriends.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mutualFriends.map(friend => (
                <div key={friend._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)' }}>
                  <img src={friend.profilePicture} alt="" className="avatar avatar-sm" style={{ width: '40px', height: '40px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600' }}>{friend.username}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{friend.online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No mutual friends found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MutualFriendsModal;
