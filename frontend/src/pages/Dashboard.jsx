import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import ProfileView from '../components/ProfileView';
import AddFriendModal from '../components/AddFriendModal';
import DiscoverUsers from '../components/DiscoverUsers';
import PendingRequestsModal from '../components/PendingRequestsModal';
import CreateGroupModal from '../components/CreateGroupModal';
import MutualFriendsModal from '../components/MutualFriendsModal';
import CallOverlay from '../components/CallOverlay';
import { authAPI, messageAPI, userAPI, mediaAPI, friendAPI, groupAPI } from '../services/api';
import { 
  initiateSocket, subscribeToMessages, sendMessageSocket, subscribeToStatus, 
  subscribeToTyping, subscribeToReactions, subscribeToDelete, subscribeToIncomingCall, 
  subscribeToMessageStatus, emitMessageRead, emitMessageDelivered,
  emitClearChat, subscribeToClearChat
} from '../services/socket';

console.log('API Service debug - friendAPI keys:', Object.keys(friendAPI));

const Dashboard = ({ user, setUser, canInstall, onInstall }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [activeCall, setActiveCall] = useState(null);
  const [toast, setToast] = useState(null);
  const activeChatRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);


  useEffect(() => {
    const userId = user.id || user._id;
    if (!userId) return;

    const socket = initiateSocket(userId.toString());
    
    // Fetch initial data
    fetchConversations();
    fetchFriends();
    fetchGroups();
    fetchDiscoverUsers();

    const unsubMessages = subscribeToMessages(async (err, msg) => {
      if (msg) {
        const currentActive = activeChatRef.current;
        const myId = (user.id || user._id)?.toString();
        const msgSenderId = msg.senderId?.toString();
        const msgReceiverId = msg.receiverId?.toString();
        const msgGroupId = msg.groupId?.toString();
        const activeId = currentActive?._id?.toString();

        const isFromActive = currentActive && (msgSenderId === activeId || msgGroupId === activeId);
        const isToActive = currentActive && (msgReceiverId === activeId);

        const isMe = msgSenderId === myId;

        if (isFromActive || isToActive) {
          setMessages(prev => {
            if (prev.some(m => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
          if (isFromActive && !msg.groupId && !msg.isViewOnce) {
            try {
              await messageAPI.markAsRead(msg.senderId);
            } catch (e) {
              console.error('Socket markAsRead error:', e);
            }
          }
          // Play sound if someone else sent it to the active window
          if (!isMe) playReceivedSound();
        } else if (!isMe) {
          // Message for a different chat or background
          playReceivedSound();
          showNotification(msg);
        }
        fetchConversations(); // Update sidebar preview
        if (msg.groupId) fetchGroups();
      }
    });

    const unsubStatus = subscribeToStatus(
      (uid) => updateOnlineStatus(uid, true),
      (uid) => updateOnlineStatus(uid, false)
    );

    const unsubTyping = subscribeToTyping(
      ({ senderId }) => setTypingUsers(prev => new Set(prev).add(senderId)),
      ({ senderId }) => setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(senderId);
        return next;
      })
    );

    const unsubReactions = subscribeToReactions(({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => 
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    const unsubDelete = subscribeToDelete((err, data) => {
      if (data) {
        setMessages(prev => prev.filter(m => m._id !== data.messageId));
        fetchConversations(); // Refresh sidebar to remove empty chats
      }
    });

    const handleLocalDelete = (e) => {
      const { messageId } = e.detail;
      setMessages(prev => prev.filter(m => m._id !== messageId));
      fetchConversations(); // Refresh sidebar
    };
    window.addEventListener('message-deleted-locally', handleLocalDelete);

    const unsubIncomingColl = subscribeToIncomingCall(({ from, offer, callType }) => {
      console.log(`Incoming call event received from ${from?.username || 'Unknown'}`);
      setActiveCall({
        otherUser: from,
        isIncoming: true,
        initialOffer: offer,
        callType
      });
    });

    const unsubMessageStatus = subscribeToMessageStatus(({ messageId, status, delivered, read }) => {
      setMessages(prev => prev.map(m => {
        if (m._id === messageId) {
          return { 
            ...m, 
            delivered: delivered !== undefined ? delivered : m.delivered, 
            read: read !== undefined ? read : m.read 
          };
        }
        return m;
      }));
      fetchConversations(); // Update sidebar preview
    });
    
    const unsubClearChat = subscribeToClearChat((data) => {
      // data: { chatId, isGroup, senderId }
      if (activeChatRef.current && activeChatRef.current._id === data.chatId) {
        setMessages([]);
      }
      fetchConversations();
      if (data.isGroup) fetchGroups();
    });

    // Removed automatic cleanup on refresh to support 24-hour persistence logic
    // const handleUnloadCleanup = () => {
    //   if (activeChatRef.current && !activeChatRef.current.isGroup && activeChatRef.current._id) {
    //     messageAPI.cleanupMessages(activeChatRef.current._id).catch(() => {});
    //   }
    // };
    // window.addEventListener('beforeunload', handleUnloadCleanup);

    const handleRefreshConversations = () => fetchConversations();
    window.addEventListener('refresh-conversations', handleRefreshConversations);

    return () => {
      unsubMessages();
      unsubStatus();
      unsubTyping();
      unsubReactions();
      unsubDelete();
      unsubIncomingColl();
      unsubMessageStatus();
      unsubClearChat();
      window.removeEventListener('message-deleted-locally', handleLocalDelete);
      // window.removeEventListener('beforeunload', handleUnloadCleanup);
      window.removeEventListener('refresh-conversations', handleRefreshConversations);
      handleRefreshConversations();
    };
  }, [user.id, user._id]);

  // Handle automatic acknowledgments
  useEffect(() => {
    if (!activeChat || activeChat.isGroup) return;

    // Acknowledge read for existing unread messages from this user
    const acknowledgeRead = async () => {
      // EXCLUDE isViewOnce messages from auto-read. They must only be read via markViewed
      const unreadMessages = messages.filter(m => m.senderId === activeChat._id && !m.read && !m.isViewOnce);
      for (const msg of unreadMessages) {
        emitMessageRead({ messageId: msg._id, senderId: user.id || user._id });
      }
    };
    acknowledgeRead();

    // Acknowledge delivery for messages just received
    const acknowledgeDelivery = async () => {
      const undeliveredMessages = messages.filter(m => m.senderId === activeChat._id && !m.delivered);
      for (const msg of undeliveredMessages) {
        emitMessageDelivered({ messageId: msg._id, senderId: user.id || user._id });
      }
    };
    acknowledgeDelivery();

  }, [messages.length, activeChat?._id]);

  // Handle messages separately to avoid dependency loops if needed, 
  // but better to keep listeners stable.
  useEffect(() => {
    if (!activeChat) return;
    fetchMessages(activeChat.isGroup ? activeChat._id : activeChat._id);
  }, [activeChat?._id]);

  const fetchConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await groupAPI.getAll();
      setGroups(res.data);
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await userAPI.getFriends();
      setFriends(res.data);
    } catch (err) {
      console.error('Failed to fetch friends', err);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await friendAPI.getPending();
      setPendingCount(res.data.length);
    } catch (err) {
      console.error('Failed to fetch pending requests', err);
    }
  };

  const fetchDiscoverUsers = async () => {
    try {
      const res = await friendAPI.discover();
      setDiscoverUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch discover users', err);
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const updateOnlineStatus = (userId, isOnline) => {
    setConversations(prev => prev.map(conv => {
      if (conv.otherUser && conv.otherUser._id?.toString() === userId?.toString()) {
        return { ...conv, otherUser: { ...conv.otherUser, online: isOnline } };
      }
      return conv;
    }));
    if (activeChat && activeChat._id?.toString() === userId?.toString()) {
      setActiveChat(prev => ({ ...prev, online: isOnline }));
    }
  };

  const handleSelectChatFromSidebar = async (chat) => {
    // If there's an existing active chat, cleanup its read messages before switching
    if (activeChat && !activeChat.isGroup) {
      try {
        await messageAPI.cleanupMessages(activeChat._id);
      } catch (e) {
        console.error('Cleanup on switch error:', e);
      }
    }

    const otherUser = chat.otherUser;
    setActiveChat({ ...otherUser, isGroup: chat.isGroup, _id: chat.isGroup ? chat._id : otherUser._id });
    
    if (chat.isGroup) {
       // Fetch group messages (backend handles this similarly in getMessages)
       fetchMessages(chat._id);
    } else {
       fetchMessages(otherUser._id);
       // Mark as read (only for private for now)
       try {
         await messageAPI.markAsRead(otherUser._id);
         fetchConversations();
       } catch (err) {
         console.error('Failed to mark as read', err);
       }
    }
  };

  const handleSelectChatFromSearch = async (selectedUser) => {
    // Check if already friends
    const isFriend = friends.some(f => (f._id?.toString() || f.id?.toString()) === selectedUser._id?.toString());
    if (isFriend) {
      setActiveChat(selectedUser);
      fetchMessages(selectedUser._id);
      
      // Mark as read (just in case)
      try {
        await messageAPI.markAsRead(selectedUser._id);
        fetchConversations();
      } catch (err) {
        console.error('Failed to mark as read', err);
      }
    } else {
      // Open add friend request UI/dialog
      setIsAddFriendOpen(true);
    }
  };

  const fetchMessages = async (otherUserId) => {
    try {
      const res = await messageAPI.getMessages(otherUserId);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    return audioCtxRef.current;
  };

  const playReceivedSound = () => {
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;
      
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.15);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (err) {
      console.log('Received sound skipped:', err);
    }
  };

  const showNotification = (msg) => {
    // 1. System notification if tab is hidden
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      const title = msg.senderUsername || 'New Message';
      const body = msg.mediaType ? `Sent a ${msg.mediaType}` : msg.text;
      new Notification(title, { body, icon: '/favicon.ico' });
    } 
    
    // 2. Always show in-app toast if it's from a background chat (regardless of visibility)
    setToast({
      title: msg.senderUsername || 'New Message',
      message: msg.mediaType ? `Sent a ${msg.mediaType}` : msg.text,
      senderId: msg.senderId,
      groupId: msg.groupId
    });

    // Auto-dismiss toast
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const playSentSound = () => {
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;
      
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.12);

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (err) {
      console.log('Sound feedback skipped:', err);
    }
  };

  const handleSendMessage = async (text, mediaData, mediaType, isViewOnce = false) => {
    if (!activeChat) return;

    // Create a temporary optimistic message
    const tempId = 'temp-' + Date.now();
    const optimisticMessage = {
      _id: tempId,
      senderId: (user.id || user._id).toString(),
      receiverId: activeChat.isGroup ? null : activeChat._id,
      groupId: activeChat.isGroup ? activeChat._id : null,
      text,
      mediaUrl: mediaData ? (typeof mediaData === 'string' ? mediaData : URL.createObjectURL(mediaData)) : '',
      mediaType,
      isViewOnce,
      createdAt: new Date().toISOString(),
      pending: true,
      senderUsername: user.username,
      senderProfilePicture: user.profilePicture
    };

    // Update UI immediately (Optimistic UI)
    setMessages(prev => [...prev, optimisticMessage]);
    playSentSound();

    try {
      let mediaUrl = '';
      let publicId = '';
      
      if (mediaData) {
        setIsUploading(true);
        const uploadRes = await mediaAPI.upload({ file: mediaData, resourceType: mediaType });
        mediaUrl = uploadRes.data.url;
        publicId = uploadRes.data.public_id;
      }

      const data = {
        receiverId: activeChat.isGroup ? null : activeChat._id,
        groupId: activeChat.isGroup ? activeChat._id : null,
        text,
        mediaUrl,
        mediaType,
        isViewOnce,
        publicId
      };
      
      const res = await messageAPI.sendMessage(data);
      const serverMessage = { ...res.data, senderId: (user.id || user._id).toString() };
      
      // Replace optimistic message with actual server message
      setMessages(prev => prev.map(m => m._id === tempId ? serverMessage : m));
      
      sendMessageSocket(serverMessage);
      fetchConversations();
      if (activeChat.isGroup) fetchGroups();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove the failed message or show error state
      setMessages(prev => prev.filter(m => m._id !== tempId));
      alert('Message sending failed. Please check your connection.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFullChat = async () => {
    if (!activeChat) return;
    try {
      if (activeChat.isGroup) {
        // Find if user is admin
        const group = groups.find(g => g._id === activeChat._id);
        if (group && group.admin._id === (user.id || user._id)) {
           await groupAPI.deleteGroup(activeChat._id);
        } else {
           await groupAPI.leaveGroup(activeChat._id);
        }
        emitClearChat({ chatId: activeChat._id, isGroup: true, senderId: user.id || user._id });
        fetchGroups();
      } else {
        await messageAPI.deleteAll(activeChat._id);
        emitClearChat({ chatId: activeChat._id, isGroup: false, senderId: user.id || user._id });
      }
      setMessages([]);
      fetchConversations();
      setActiveChat(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
      alert('Failed to delete conversation.');
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      await groupAPI.create(groupData);
      setIsCreateGroupOpen(false);
      fetchGroups();
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const [isMutualOpen, setIsMutualOpen] = useState(false);
  const [mutualUserId, setMutualUserId] = useState(null);

  const handleOpenMutual = (userId) => {
    setMutualUserId(userId);
    setIsMutualOpen(true);
  };

  return (
    <div className="app-container">
      <div className={`sidebar ${activeChat ? 'mobile-hidden' : ''}`}>
        <Sidebar 
          user={user} 
          conversations={conversations} 
          friends={friends}
          pendingCount={pendingCount}
          onSelectChat={handleSelectChatFromSidebar}
          onSearchSelect={handleSelectChatFromSearch}
          onOpenMutual={handleOpenMutual}
          onLogout={handleLogout}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAddFriend={() => setIsAddFriendOpen(true)}
          onOpenDiscover={() => setIsDiscoverOpen(true)}
          onOpenRequests={() => setIsRequestsOpen(true)}
          onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
          groups={groups}
          discoverUsers={discoverUsers}
          onSendRequest={async (userId) => {
            await friendAPI.sendRequest(userId);
            fetchPendingCount();
            fetchDiscoverUsers();
          }}
          onDeletePerson={async (friendId) => {
            if (!friendId) return;
            try {
              await friendAPI.unfriend(friendId);
              if (activeChat && activeChat._id === friendId) {
                setActiveChat(null);
              }
              // Refresh everything
              fetchConversations();
              fetchFriends();
              fetchDiscoverUsers();
            } catch (err) {
              console.error('Failed to delete person:', err);
            }
          }}
          canInstall={canInstall}
          onInstall={onInstall}
        />
      </div>
      
      <div className={`chat-window ${!activeChat ? 'mobile-hidden' : ''}`}>
        <ChatWindow 
          activeChat={activeChat} 
          user={user} 
          messages={messages || []}
          onSendMessage={handleSendMessage}
          onDeleteChat={handleDeleteFullChat}
          isUploading={isUploading}
          isTyping={activeChat && typingUsers.has(activeChat._id)}
          onInitiateCall={(type) => {
            setActiveCall({
              otherUser: activeChat,
              isIncoming: false,
              callType: type
            });
          }}
          onBack={() => setActiveChat(null)}
        />
      </div>

      {isProfileOpen && (
        <ProfileView 
          user={user} 
          onClose={() => setIsProfileOpen(false)}
          onUpdateUser={(updatedUser) => setUser(updatedUser)}
        />
      )}

      {isAddFriendOpen && (
        <AddFriendModal 
          onClose={() => setIsAddFriendOpen(false)} 
          onOpenMutual={handleOpenMutual}
        />
      )}

      {isDiscoverOpen && (
        <DiscoverUsers 
          onClose={() => setIsDiscoverOpen(false)}
          onSendRequest={() => fetchPendingCount()}
        />
      )}

      {isMutualOpen && (
        <MutualFriendsModal 
          otherUserId={mutualUserId} 
          onClose={() => setIsMutualOpen(false)} 
        />
      )}

      {isRequestsOpen && (
        <PendingRequestsModal 
          onClose={() => setIsRequestsOpen(false)}
          onAccepted={() => {
            fetchFriends();
            fetchPendingCount();
          }}
        />
      )}

      {isCreateGroupOpen && (
        <CreateGroupModal 
          friends={friends}
          onClose={() => setIsCreateGroupOpen(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {activeCall && (
        <CallOverlay 
          currentUser={user}
          otherUser={activeCall.otherUser}
          callType={activeCall.callType}
          isIncoming={activeCall.isIncoming}
          initialOffer={activeCall.initialOffer}
          onClose={() => setActiveCall(null)}
          onSendMessage={handleSendMessage}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast-notification" onClick={() => {
            if (toast.groupId) {
              const group = groups.find(g => g._id === toast.groupId);
              if (group) handleSelectChatFromSidebar({ ...group, isGroup: true });
            } else {
              const conv = conversations.find(c => c.otherUser?._id === toast.senderId);
              if (conv) handleSelectChatFromSidebar(conv);
            }
            setToast(null);
          }}>
            <div className="toast-icon">
              <i className="fas fa-comment-alt"></i>
            </div>
            <div className="toast-content">
              <h4 className="toast-title">{toast.title}</h4>
              <p className="toast-message">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
