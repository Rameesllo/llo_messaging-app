import React, { useState } from 'react';
import { X, User, Plus, Users, Camera } from 'lucide-react';

const CreateGroupModal = ({ friends, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [description, setDescription] = useState('');

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId) 
        : [...prev, friendId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || selectedFriends.length === 0) return;
    onCreate({ name, description, members: selectedFriends });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button onClick={onClose} className="icon-btn"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="avatar-edit-container">
             <div className="avatar-wrapper group-modal-avatar-wrapper">
                 <Users size={60} />
             </div>
          </div>

          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Select Friends ({selectedFriends.length})</label>
            <div className="group-modal-friends-list">
              {friends.map(friend => (
                <div 
                  key={friend._id} 
                  onClick={() => toggleFriend(friend._id)}
                  className={`group-modal-friend-item ${selectedFriends.includes(friend._id) ? 'selected' : ''}`}
                >
                  <img src={friend.profilePicture} className="avatar avatar-xs" alt="" />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{friend.username}</span>
                  {selectedFriends.includes(friend._id) && <Plus size={16} style={{ marginLeft: 'auto', transform: 'rotate(45deg)' }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="btn-group">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!name.trim() || selectedFriends.length === 0}
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
