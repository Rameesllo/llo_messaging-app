import React, { useState } from 'react';
import { Search, User, LogOut, MessageSquare, Plus, Send, ArrowRight, UserPlus, Bell, Moon, Sun, Users, Compass, Mars, Venus, Calendar, Download, Trash2 } from 'lucide-react';
import { userAPI } from '../services/api';

const Sidebar = ({ user, conversations, friends, groups = [], pendingCount, onSelectChat, onSearchSelect, onOpenMutual, onLogout, onOpenProfile, onOpenAddFriend, onOpenRequests, onOpenCreateGroup, onOpenDiscover, discoverUsers = [], onSendRequest, canInstall, onInstall, onDeletePerson }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      setIsSearching(true);
      try {
        const { data } = await userAPI.search(query);
        setSearchResults(data);
      } catch (err) {
        console.error('Search error:', err);
      }
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const getStatusPreview = (chat) => {
    if (chat.isNew) return 'New connection';
    const lastMsg = chat.lastMessage;
    if (!lastMsg) return 'No messages yet';
    
    if (lastMsg.mediaType === 'image' || lastMsg.mediaType === 'video') {
      return `✨ LLO ${lastMsg.mediaType.toUpperCase()}`;
    }
    
    if (lastMsg.mediaType === 'sticker') return '🎨 Sticker';
    if (lastMsg.mediaType === 'audio') return '🎤 Voice Message';
    return lastMsg.text || 'Message';
  };

  const getGenderIcon = (gender) => {
    if (gender === 'Male') return <Mars size={12} style={{ color: '#3b82f6' }} />;
    if (gender === 'Female') return <Venus size={12} style={{ color: '#ec4899' }} />;
    return null;
  };

  const formatBirthday = (dob) => {
    if (!dob) return '';
    const date = new Date(dob);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getUnifiedList = () => {
    const list = [...(conversations || [])];
    
    (friends || []).forEach(friend => {
      const alreadyInConversations = list.some(c => 
        (c.otherUser?._id || c.otherUser?.id) === (friend._id || friend.id)
      );
      if (!alreadyInConversations) {
        list.push({
          otherUser: friend,
          isNew: true,
          _id: `friend-${friend._id || friend.id}`
        });
      }
    });

    groups.forEach(group => {
       list.push({
         ...group,
         otherUser: {
           username: group.name,
           profilePicture: group.avatar || 'https://cdn-icons-png.flaticon.com/512/166/166258.png',
           online: true
         },
         isGroup: true
       });
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.createdAt || 0);
      const timeB = new Date(b.lastMessage?.createdAt || b.createdAt || 0);
      return timeB - timeA;
    });
  };

  const unifiedList = getUnifiedList();

  return (
    <div className="sidebar">
      <div className="search-container">
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <div className="sidebar-user-avatar-container" onClick={onOpenProfile} title="Edit Profile">
              <img src={user?.profilePicture} alt="profile" className="avatar avatar-sm hover:ring-2 hover:ring-sky-500 transition-all" />
            </div>
            <h1 className="sidebar-title">Messages</h1>
          </div>
          <div className="sidebar-header-right">
            <button onClick={onOpenAddFriend} className="icon-btn" title="Add Friends"><UserPlus size={20} /></button>
            <button onClick={onOpenDiscover} className="icon-btn" title="Discover People"><Compass size={20} /></button>
            <button onClick={onOpenRequests} className="icon-btn" title="Friend Requests">
              <Bell size={20} />
              {pendingCount > 0 && (
                <span className="sidebar-header-badge">
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={onOpenCreateGroup} className="icon-btn" title="Create Group"><Users size={20} /></button>
          </div>
        </div>
        <div className="search-input-wrapper">
          <Search size={18} className="sidebar-search-icon" />
          <input type="text" placeholder="Search contacts" className="search-input" value={searchQuery} onChange={handleSearch} />
        </div>
      </div>

      <div className="sidebar-scroll-area">
        {isSearching ? (
          <div className="search-results-section">
            <h3 className="sidebar-section-title">Add People</h3>
            {searchResults.map((result) => (
              <button key={result._id} onClick={() => { onSearchSelect(result); setSearchQuery(''); setIsSearching(false); }} className="sidebar-item">
                <img src={result.profilePicture} className="avatar avatar-md" alt="" />
                <div className="sidebar-item-info">
                  <p className="sidebar-item-username">{result.username}</p>
                  <p className="sidebar-item-preview">{result.bio || 'Available'}</p>
                </div>
                <Plus size={20} style={{ color: 'var(--sky-500)' }} />
              </button>
            ))}
            {searchResults.length === 0 && <p className="sidebar-empty-p">No users found</p>}
          </div>
        ) : (
          <>
            {/* Active Chats & Friends */}
            {unifiedList.map((item) => (
              <div key={item._id} className="sidebar-item-container animate-in">
                <button 
                  onClick={() => item.isNew ? onSearchSelect(item.otherUser) : onSelectChat(item)} 
                  className={`sidebar-item ${(!item.isNew && !item.isGroup && item.otherUser?._id === item.activeId) ? 'active' : ''}`}
                >
                  <div className="sidebar-item-avatar-wrapper">
                    <img src={item.otherUser?.profilePicture} className="avatar avatar-md" alt="" />
                    {item.otherUser?.online && <div className="online-indicator pulse-online"></div>}
                  </div>
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-header">
                      <h3 className={`sidebar-item-username ${item.unreadCount > 0 ? 'unread' : ''}`}>{item.otherUser?.username}</h3>
                      <span className={`sidebar-item-time ${item.unreadCount > 0 ? 'unread' : ''}`}>{item.isNew ? '' : getRelativeTime(item.createdAt)}</span>
                    </div>
                    <div className="sidebar-item-preview-row">
                      <p className={`sidebar-item-preview ${item.unreadCount > 0 ? 'unread' : ''}`}>{getStatusPreview(item)}</p>
                      {item.unreadCount > 0 && (
                        <span className="sidebar-unread-badge">{item.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </button>
                {!item.isGroup && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetId = item.otherUser?._id || item.otherUser?.id;
                      if (!targetId) return;
                      
                      if (window.confirm(`Delete ${item.otherUser?.username} and all messages?`)) {
                        onDeletePerson(targetId);
                      }
                    }} 
                    className="sidebar-delete-btn"
                    title="Delete Connection"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}

            {/* Discover People Section */}
            {discoverUsers.length > 0 && (
              <div className="discover-section">
                <h3 className="sidebar-section-title">Discover People</h3>
                {discoverUsers.map((discoverUser) => (
                  <div key={discoverUser._id} className="sidebar-item" style={{ cursor: 'default' }}>
                    <img src={discoverUser.profilePicture} className="avatar avatar-md" alt="" />
                    <div className="sidebar-item-info">
                      <p className="sidebar-item-username">{discoverUser.username}</p>
                      <div className="discover-user-meta">
                        {discoverUser.gender && (
                          <span className="discover-meta-item">
                            {getGenderIcon(discoverUser.gender)}
                            {discoverUser.gender}
                          </span>
                        )}
                        {discoverUser.dateOfBirth && <span>• {formatBirthday(discoverUser.dateOfBirth)}</span>}
                      </div>
                    </div>
                    <button onClick={() => onSendRequest(discoverUser._id)} className="discover-add-btn" title="Add Friend">
                      <UserPlus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {unifiedList.length === 0 && discoverUsers.length === 0 && (
               <div className="sidebar-empty-state">
                  <Compass size={40} className="sidebar-empty-icon" />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No users to discover right now.</p>
               </div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        {canInstall && (
          <button 
            onClick={onInstall} 
            className="sidebar-footer-btn install"
          >
            <Download size={20} />
            <span>Install App</span>
          </button>
        )}
        <button onClick={onLogout} className="sidebar-footer-btn logout">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
