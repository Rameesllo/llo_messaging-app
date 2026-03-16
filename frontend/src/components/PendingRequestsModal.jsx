import React, { useState, useEffect } from 'react';
import { X, Check, XCircle, Loader2, UserCheck } from 'lucide-react';
import { friendAPI } from '../services/api';

const PendingRequestsModal = ({ onClose, onAccepted }) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState({}); // { requestId: 'accepting' | 'rejecting' | 'done' }

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await friendAPI.getPending();
      setRequests(res.data);
    } catch (err) {
      console.error('Fetch requests error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (requestId, action) => {
    setActionStatus(prev => ({ ...prev, [requestId]: action === 'accept' ? 'accepting' : 'rejecting' }));
    try {
      if (action === 'accept') {
        await friendAPI.acceptRequest(requestId);
        if (onAccepted) onAccepted();
      } else {
        // Reject logic could go here (delete request)
      }
      setActionStatus(prev => ({ ...prev, [requestId]: 'done' }));
      // Remove from list after positive feedback
      setTimeout(() => {
        setRequests(prev => prev.filter(req => req._id !== requestId));
      }, 500);
    } catch (err) {
      console.error('Friend request action error:', err);
      setActionStatus(prev => ({ ...prev, [requestId]: 'error' }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Pending Friend Requests</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin" size={24} color="#0ea5e9" />
            </div>
          ) : requests.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {requests.map(request => (
                <div key={request._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={request.sender.profilePicture} alt="" className="avatar avatar-sm" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>@{request.sender.username}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>wants to be your friend</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {actionStatus[request._id] === 'done' ? (
                      <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 'bold' }}>Accepted!</span>
                    ) : (
                      <>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px', background: '#22c55e' }}
                          disabled={actionStatus[request._id]}
                          onClick={() => handleAction(request._id, 'accept')}
                        >
                          {actionStatus[request._id] === 'accepting' ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={16} />
                              <span>Accept</span>
                            </div>
                          )}
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }}
                          disabled={actionStatus[request._id]}
                          onClick={() => handleAction(request._id, 'reject')}
                        >
                          {actionStatus[request._id] === 'rejecting' ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <X size={16} />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UserCheck size={32} color="var(--text-muted)" />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No pending requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingRequestsModal;
