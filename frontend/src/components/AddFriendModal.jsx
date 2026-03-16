import React, { useState } from 'react';
import { Search, UserPlus, X, Check, Loader2 } from 'lucide-react';
import { friendAPI } from '../services/api';

const AddFriendModal = ({ onClose, onOpenMutual }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState({}); // { userId: 'pending' | 'sent' | 'error' }

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await friendAPI.search(query);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (userId) => {
    setRequestStatus(prev => ({ ...prev, [userId]: 'pending' }));
    try {
      await friendAPI.sendRequest(userId);
      setRequestStatus(prev => ({ ...prev, [userId]: 'sent' }));
    } catch (err) {
      console.error('Send request error:', err);
      setRequestStatus(prev => ({ ...prev, [userId]: 'error' }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Add Friends</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '24px' }}>
          <div className="search-input-wrapper" style={{ marginBottom: '24px' }}>
            <Search className="search-icon" size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search by username..." 
              value={searchQuery}
              onChange={handleSearch}
              autoFocus
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 className="animate-spin" size={24} color="#0ea5e9" />
              </div>
            ) : searchResults.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map(user => (
                  <div key={user._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={user.profilePicture} alt="" className="avatar avatar-sm" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>@{user.username}</span>
                        {user.mutualCount > 0 && (
                          <span 
                            onClick={(e) => { e.stopPropagation(); onOpenMutual(user._id); }}
                            style={{ fontSize: '11px', color: 'var(--sky-500)', cursor: 'pointer', fontWeight: '500' }}
                          >
                            {user.mutualCount} mutual friends
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      className="btn-primary" 
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '13px', 
                        borderRadius: '8px',
                        background: requestStatus[user._id] === 'sent' ? '#22c55e' : '#0ea5e9'
                      }}
                      disabled={requestStatus[user._id] === 'pending' || requestStatus[user._id] === 'sent'}
                      onClick={() => sendFriendRequest(user._id)}
                    >
                      {requestStatus[user._id] === 'pending' ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : requestStatus[user._id] === 'sent' ? (
                        <Check size={16} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <UserPlus size={16} />
                          <span>Add</span>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 2 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>No users found matching "{searchQuery}"</p>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>Try searching for a friend's username</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddFriendModal;
