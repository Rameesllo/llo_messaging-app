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
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%', height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Compass size={24} className="text-sky-500" />
            <h2 style={{ margin: 0 }}>Discover People</h2>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={20} /></button>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="search-input-wrapper">
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search users to discover..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="loading-spinner"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <Compass size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <p>No new people found to discover.</p>
            </div>
          ) : (
            <div className="discover-grid">
              {filteredUsers.map(user => (
                <div key={user._id} className="user-discover-card">
                  <div style={{ position: 'relative' }}>
                    <img src={user.profilePicture} alt={user.username} className="avatar avatar-lg" style={{ width: '80px', height: '80px', margin: '0 auto 12px' }} />
                    {user.online && <div className="online-indicator" style={{ border: '3px solid var(--bg-secondary)', width: '16px', height: '16px', bottom: '15px', right: 'calc(50% - 40px)' }}></div>}
                  </div>
                  
                  <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 'bold' }}>{user.username}</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {user.gender && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getGenderIcon(user.gender)}
                        {user.gender}
                      </span>
                    )}
                    {user.gender && user.dateOfBirth && <span>•</span>}
                    {user.dateOfBirth && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} />
                        {formatBirthday(user.dateOfBirth)}
                      </span>
                    )}
                  </div>

                  <p className="truncate-2" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', height: '32px' }}>
                    {user.bio || 'No bio available'}
                  </p>

                  {sentRequests.has(user._id) ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%', cursor: 'default' }}>
                      Pending
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSendRequest(user._id)}
                      className="btn btn-primary" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <UserPlus size={16} />
                      Add Friend
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .discover-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        .user-discover-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          transition: all 0.2s;
        }
        .user-discover-card:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
          border-color: var(--sky-500);
        }
        .truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default DiscoverUsers;
