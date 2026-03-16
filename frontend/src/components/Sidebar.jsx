import React, { useState } from 'react';
import { Search, User, LogOut, MessageSquare, Plus, Send, ArrowRight, UserPlus, Bell, Moon, Sun, Users } from 'lucide-react';
import { userAPI } from '../services/api';

const Sidebar = ({ user, conversations, friends, groups = [], pendingCount, onSelectChat, onSearchSelect, onOpenMutual, onLogout, onOpenProfile, onOpenAddFriend, onOpenRequests, onOpenCreateGroup }) => {
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
    
    // Check if it's an LLO (View Once Media)
    if (lastMsg.mediaType === 'image' || lastMsg.mediaType === 'video') {
      return `✨ LLO ${lastMsg.mediaType.toUpperCase()}`;
    }
    
    if (lastMsg.mediaType === 'sticker') return '🎨 Sticker';
    if (lastMsg.mediaType === 'audio') return '🎤 Voice Message';
    return lastMsg.text || 'Message';
  };

  // Ensure we have a unified list of chats
  const getUnifiedList = () => {
    const list = [...(conversations || [])];
    
    // Add friends who haven't been chatted with yet
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

    // Add groups
    groups.forEach(group => {
       list.push({
         ...group,
         otherUser: {
           username: group.name,
           profilePicture: group.avatar || 'https://cdn-icons-png.flaticon.com/512/166/166258.png',
           online: true // Groups are always "active"
         },
         isGroup: true
       });
    });

    // Sort by latest message
    return list.sort((a, b) => {
      const timeA = new Date(a.lastMessage?.createdAt || a.createdAt || 0);
      const timeB = new Date(b.lastMessage?.createdAt || b.createdAt || 0);
      return timeB - timeA;
    });
  };

  const unifiedList = getUnifiedList();

  return (
    <div className="sidebar">
      {/* Search Header */}
      <div className="search-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ position: 'relative', cursor: 'pointer' }} 
              onClick={onOpenProfile}
              title="Edit Profile"
            >
              <img 
                src={user?.profilePicture} 
                alt="profile" 
                className="avatar avatar-sm hover:ring-2 hover:ring-sky-500 transition-all"
                style={{ width: '40px', height: '40px' }}
              />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Messages</h1>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onOpenAddFriend} className="icon-btn" title="Add Friends">
              <UserPlus size={20} />
            </button>
            <button onClick={onOpenRequests} className="icon-btn" title="Friend Requests" style={{ position: 'relative' }}>
              <Bell size={20} />
              {pendingCount > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  right: '4px', 
                  background: '#ef4444', 
                  color: 'white', 
                  fontSize: '10px', 
                  borderRadius: '50%', 
                  width: '14px', 
                  height: '14px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={onOpenCreateGroup} className="icon-btn" title="Create Group">
              <Users size={20} />
            </button>
          </div>
        </div>
        <div className="search-input-wrapper">
          <Search size={18} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search contacts"
            className="search-input"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Unified List */}
      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {isSearching ? (
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', padding: '16px 16px 8px' }}>Add People</h3>
            {searchResults.map((result) => (
              <button
                key={result._id}
                onClick={() => {
                  onSearchSelect(result);
                  setSearchQuery('');
                  setIsSearching(false);
                }}
                className="sidebar-item"
              >
                <img src={result.profilePicture} className="avatar avatar-md" style={{ width: '56px', height: '56px' }} alt="" />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{result.username}</p>
                  <p className="truncate" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{result.bio || 'Available'}</p>
                  {result.mutualCount > 0 && (
                    <p 
                      onClick={(e) => { e.stopPropagation(); onOpenMutual(result._id); }}
                      style={{ fontSize: '11px', color: 'var(--sky-500)', fontWeight: '600', cursor: 'pointer' }}
                    >
                      {result.mutualCount} mutual friends
                    </p>
                  )}
                </div>
                <Plus size={20} style={{ color: 'var(--sky-500)' }} />
              </button>
            ))}
          </div>
        ) : (
          <>
            {unifiedList.map((item) => (
              <button
                key={item._id}
                onClick={() => item.isNew ? onSearchSelect(item.otherUser) : onSelectChat(item)}
                className="sidebar-item"
                style={{ position: 'relative' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                   <img 
                    src={item.otherUser?.profilePicture} 
                    className="avatar avatar-md" 
                    style={{ width: '56px', height: '56px' }}
                    alt="" 
                  />
                  {item.otherUser?.online && <div className="online-indicator"></div>}
                </div>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ 
                      fontWeight: (item.unreadCount > 0) ? '800' : 'bold', 
                      margin: 0,
                      fontSize: '15px',
                      color: 'var(--text-primary)'
                    }}>
                      {item.otherUser?.username}
                    </h3>
                    <span style={{ 
                      fontSize: '11px', 
                      color: (item.unreadCount > 0) ? 'var(--sky-500)' : 'var(--text-muted)',
                      fontWeight: (item.unreadCount > 0) ? '600' : 'normal'
                    }}>
                      {item.isNew ? '' : getRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <p className="truncate" style={{ 
                      fontSize: '13px', 
                      color: (item.unreadCount > 0) ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: (item.unreadCount > 0) ? '500' : 'normal',
                      margin: 0,
                      flex: 1
                    }}>
                      {getStatusPreview(item)}
                    </p>
                    {item.unreadCount > 0 && (
                      <span style={{ 
                        background: '#0ea5e9', 
                        color: 'white', 
                        fontSize: '10px', 
                        fontWeight: 'bold', 
                        borderRadius: '10px', 
                        minWidth: '18px', 
                        height: '18px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '0 5px',
                        marginLeft: '8px'
                      }}>
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid var(--border-color)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        backgroundColor: 'rgba(15, 23, 42, 0.4)'
      }}>
        <button 
          onClick={onLogout} 
          className="sidebar-footer-btn" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '10px 16px', 
            borderRadius: '12px',
            width: '100%',
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.05)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s',
            fontSize: '14px'
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
