import React, { useState, useEffect } from 'react';
import { X, Plus, UserPlus, Search, User, Compass, Calendar, Mars, Venus } from 'lucide-react';
import { friendAPI } from '../services/api';

const DiscoverUsers = ({ onClose, onSendRequest }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentRequests, setSentRequests] = useState(new Set());

  useEffect(() => {
    fetchDiscoverUsers();
  }, []);

  const fetchDiscoverUsers = async () => {
    try {
      const res = await friendAPI.discover();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch discover users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await friendAPI.sendRequest(userId);
      setSentRequests(prev => new Set(prev).add(userId));
      if (onSendRequest) onSendRequest();
    } catch (err) {
      console.error('Failed to send request', err);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGenderIcon = (gender) => {
    if (gender === 'Male') return <Mars size={14} className="text-blue-500" />;
    if (gender === 'Female') return <Venus size={14} className="text-pink-500" />;
    return null;
  };

  const formatBirthday = (dob) => {
    if (!dob) return '';
    const date = new Date(dob);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <div className="modal-overlay">
      <div className="discover-modal glass-effect animate-in">
        <div className="discover-header">
          <div className="discover-header-info">
            <div className="discovery-icon-bg">
              <Compass size={22} />
            </div>
            <div className="discover-title-group">
              <h2 className="discover-title">Discover New People</h2>
              <p className="discover-subtitle">Find and connect with other users on LLO</p>
            </div>
          </div>
          <button onClick={onClose} className="discover-close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="discover-search-container">
          <div className="premium-search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by username..."
              className="premium-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="discover-scroll-content">
          {loading ? (
            <div className="discover-loading">
              <div className="premium-spinner"></div>
              <p>Finding people...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="discover-empty">
              <Compass size={64} className="empty-icon" />
              <h3>No one new here yet</h3>
              <p>Check back later for more people to discover.</p>
            </div>
          ) : (
            <div className="discover-grid-premium">
              {filteredUsers.map(user => (
                <div key={user._id} className="discover-user-card animate-in">
                  <div className="card-avatar-wrapper">
                    <img 
                      src={user.profilePicture || '/default-avatar.png'} 
                      alt={user.username} 
                      className="card-avatar" 
                    />
                    {user.online && <div className="card-online-pulse"></div>}
                  </div>
                  
                  <div className="card-info">
                    <h3 className="card-username">{user.username}</h3>
                    <div className="card-meta">
                      {user.gender && (
                        <span className="meta-item">
                          {getGenderIcon(user.gender)}
                          {user.gender}
                        </span>
                      )}
                      {user.dateOfBirth && (
                        <span className="meta-item">
                          <Calendar size={12} />
                          {formatBirthday(user.dateOfBirth)}
                        </span>
                      )}
                    </div>
                    <p className="card-bio">
                      {user.bio || 'Available on LLO Messaging'}
                    </p>
                  </div>

                  <div className="card-actions">
                    {sentRequests.has(user._id) ? (
                      <button className="premium-btn pending" disabled>
                        <span>Request Sent</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleSendRequest(user._id)}
                        className="premium-btn primary"
                      >
                        <UserPlus size={16} />
                        <span>Add Friend</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .discover-modal {
          background: var(--zinc-950);
          width: 100%;
          max-width: 800px;
          height: 85vh;
          border-radius: 32px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-premium);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .discover-header {
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: linear-gradient(to bottom, rgba(255,255,255,0.02), transparent);
        }

        .discover-header-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .discovery-icon-bg {
          width: 48px;
          height: 48px;
          background: rgba(14, 165, 233, 0.15);
          color: #3b82f6;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(14, 165, 233, 0.3);
        }

        .discover-title {
          font-size: 22px;
          font-weight: 800;
          color: white;
          margin: 0;
        }

        .discover-subtitle {
          font-size: 14px;
          color: #9ca3af;
          margin: 2px 0 0;
        }

        .discover-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: #9ca3af;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .discover-close-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .discover-search-container {
          padding: 20px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .premium-search-bar {
          position: relative;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s;
        }

        .premium-search-bar:focus-within {
          border-color: #3b82f6;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
        }

        .premium-search-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          background: transparent;
          border: none;
          color: white;
          font-size: 15px;
          outline: none;
        }

        .discover-scroll-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
        }

        .discover-grid-premium {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 24px;
        }

        .discover-user-card {
          background: var(--zinc-900);
          border-radius: 24px;
          padding: 24px;
          border: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .discover-user-card:hover {
          transform: translateY(-8px);
          background: var(--zinc-800);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }

        .card-avatar-wrapper {
          position: relative;
          margin-bottom: 16px;
        }

        .card-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255, 255, 255, 0.08);
          padding: 2px;
        }

        .card-online-pulse {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          background: #22c55e;
          border: 3px solid var(--zinc-900);
          border-radius: 50%;
        }

        .card-username {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin: 0 0 6px;
        }

        .card-meta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 99px;
        }

        .card-bio {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.5;
          margin-bottom: 20px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 39px;
        }

        .card-actions {
          width: 100%;
          margin-top: auto;
        }

        .premium-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          border: none;
        }

        .premium-btn.primary {
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .premium-btn.primary:hover {
          background: #2563eb;
          transform: scale(1.02);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }

        .premium-btn.pending {
          background: rgba(255, 255, 255, 0.05);
          color: #9ca3af;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .discover-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          color: #9ca3af;
        }

        .premium-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(59, 130, 246, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .discover-empty {
          text-align: center;
          padding: 80px 0;
          color: #6b7280;
        }

        .empty-icon {
          opacity: 0.2;
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
};

export default DiscoverUsers;
