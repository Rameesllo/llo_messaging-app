import React, { useState } from 'react';
import { Search, User, LogOut, MessageSquare, Plus, Send, ArrowRight, UserPlus, Bell, Moon, Sun, Users, Compass, Mars, Venus, Calendar, Download } from 'lucide-react';
import { userAPI } from '../services/api';

const Sidebar = ({ user, conversations, friends, groups = [], pendingCount, onSelectChat, onSearchSelect, onOpenMutual, onLogout, onOpenProfile, onOpenAddFriend, onOpenRequests, onOpenCreateGroup, onOpenDiscover, discoverUsers = [], onSendRequest, canInstall, onInstall }) => {
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
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onOpenProfile} title="Edit Profile">
              <img src={user?.profilePicture} alt="profile" className="avatar avatar-sm hover:ring-2 hover:ring-sky-500 transition-all" />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Messages</h1>
          </div>
          <div className="sidebar-header-right">
            <button onClick={onOpenAddFriend} className="icon-btn" title="Add Friends"><UserPlus size={20} /></button>
            <button onClick={onOpenDiscover} className="icon-btn" title="Discover People"><Compass size={20} /></button>
            <button onClick={onOpenRequests} className="icon-btn" title="Friend Requests" style={{ position: 'relative' }}>
              <Bell size={20} />
              {pendingCount > 0 && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', fontSize: '10px', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={onOpenCreateGroup} className="icon-btn" title="Create Group"><Users size={20} /></button>
          </div>
        </div>
        <div className="search-input-wrapper">
          <Search size={18} style={{ position: 'absolute', left: '12px', color: '#9ca3af' }} />
          <input type="text" placeholder="Search contacts" className="search-input" value={searchQuery} onChange={handleSearch} />
        </div>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {isSearching ? (
          <div>
            <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', padding: '16px 16px 8px' }}>Add People</h3>
            {searchResults.map((result) => (
              <button key={result._id} onClick={() => { onSearchSelect(result); setSearchQuery(''); setIsSearching(false); }} className="sidebar-item">
                <img src={result.profilePicture} className="avatar avatar-md" style={{ width: '56px', height: '56px' }} alt="" />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{result.username}</p>
                  <p className="truncate" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{result.bio || 'Available'}</p>
                </div>
                <Plus size={20} style={{ color: 'var(--sky-500)' }} />
              </button>
            ))}
          </div>
        ) : (
          <>
            {/* Active Chats & Friends */}
            {unifiedList.map((item) => (
              <button key={item._id} onClick={() => item.isNew ? onSearchSelect(item.otherUser) : onSelectChat(item)} className="sidebar-item" style={{ position: 'relative' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                   <img src={item.otherUser?.profilePicture} className="avatar avatar-md" style={{ width: '56px', height: '56px' }} alt="" />
                  {item.otherUser?.online && <div className="online-indicator"></div>}
                </div>
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontWeight: (item.unreadCount > 0) ? '800' : 'bold', margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>{item.otherUser?.username}</h3>
                    <span style={{ fontSize: '11px', color: (item.unreadCount > 0) ? 'var(--sky-500)' : 'var(--text-muted)', fontWeight: (item.unreadCount > 0) ? '600' : 'normal' }}>{item.isNew ? '' : getRelativeTime(item.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <p className="truncate" style={{ fontSize: '13px', color: (item.unreadCount > 0) ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: (item.unreadCount > 0) ? '500' : 'normal', margin: 0, flex: 1 }}>{getStatusPreview(item)}</p>
                    {item.unreadCount > 0 && (
                      <span style={{ background: '#0ea5e9', color: 'white', fontSize: '10px', fontWeight: 'bold', borderRadius: '10px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', marginLeft: '8px' }}>{item.unreadCount}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Discover People Section */}
            {discoverUsers.length > 0 && (
              <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', padding: '16px 16px 8px' }}>Discover People</h3>
                {discoverUsers.map((discoverUser) => (
                  <div key={discoverUser._id} className="sidebar-item" style={{ cursor: 'default' }}>
                    <img src={discoverUser.profilePicture} className="avatar avatar-md" style={{ width: '56px', height: '56px' }} alt="" />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 'bold', margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>{discoverUser.username}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {discoverUser.gender && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>{getGenderIcon(discoverUser.gender)}{discoverUser.gender}</span>}
                        {discoverUser.dateOfBirth && <span>• {formatBirthday(discoverUser.dateOfBirth)}</span>}
                      </div>
                    </div>
                    <button onClick={() => onSendRequest(discoverUser._id)} className="icon-btn-rounded" title="Add Friend" style={{ background: 'var(--sky-500)', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserPlus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {unifiedList.length === 0 && discoverUsers.length === 0 && (
               <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <Compass size={40} style={{ margin: '0 auto 16px', color: 'var(--sky-500)', opacity: 0.5 }} />
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
