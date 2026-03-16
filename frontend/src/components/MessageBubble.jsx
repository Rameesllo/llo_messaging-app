import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Check, Smile, Heart, ThumbsUp, Laugh, Frown, Play, Pause, Mic, X, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { messageAPI } from '../services/api';
import { emitReaction, emitDeleteMessage } from '../services/socket';

const MessageBubble = ({ message, isOwn, userId }) => {
  const [showReactions, setShowReactions] = React.useState(false);
  const [showDeleteActions, setShowDeleteActions] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isOpened, setIsOpened] = React.useState(false);
  const [timer, setTimer] = React.useState(null);
  const audioRef = React.useRef(null);
  const deleteActionsRef = React.useRef(null);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const isOnlyEmoji = (str) => {
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/;
    return emojiRegex.test(str.trim());
  };

  const handleToggleReaction = async (emoji) => {
    try {
      const { data } = await messageAPI.toggleReaction(message._id, emoji);
      const receiverId = isOwn ? message.receiverId : message.senderId;
      emitReaction({ receiverId, messageId: message._id, reactions: data.reactions });
      setShowReactions(false);
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleDelete = async (type = 'everyone') => {
    try {
      const deletionType = message.isViewOnce ? 'everyone' : type;
      await messageAPI.deleteMessage(message._id, deletionType);
      
      const receiverId = isOwn ? message.receiverId : message.senderId;
      const deleteData = { messageId: message._id, type: deletionType };
      if (message.groupId) deleteData.groupId = message.groupId;
      else deleteData.receiverId = receiverId;
      
      emitDeleteMessage(deleteData);
      window.dispatchEvent(new CustomEvent('message-deleted-locally', { detail: { messageId: message._id } }));
      setShowDeleteActions(false);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (deleteActionsRef.current && !deleteActionsRef.current.contains(event.target)) {
        setShowDeleteActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenViewOnce = async () => {
    setIsOpened(true);
    
    // Mark as read immediately on backend so it can't be opened again on refresh
    try {
      await messageAPI.markViewed(message._id);
      window.dispatchEvent(new CustomEvent('refresh-conversations'));
    } catch (e) {
      console.error('Failed to mark LLO as read on open:', e);
    }

    let count = 7; // Updated to 7 seconds per user request
    setTimer(count);
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDelete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleManualClose = () => {
    setTimer(0);
    handleDelete();
  };

  const renderContent = () => {
    if (message.isViewOnce && !isOpened) {
      if (message.read && !isOwn) {
        // Receiver already opened this once
        return (
          <div className="llo-btn opened" style={{ opacity: 0.5, cursor: 'default', background: 'var(--bg-input)' }}>
             <div className="llo-icon-container">
               <Check size={20} className="llo-icon" style={{ color: 'var(--sky-500)' }} />
             </div>
             <div className="llo-text">
               <div className="llo-label">LLO Opened</div>
               <div className="llo-sub">Vanished</div>
             </div>
          </div>
        );
      }

      if (isOwn) {
        // Sender sees a static "Sent LLO" bubble
        return (
          <div className="llo-btn sender-locked" style={{ 
            cursor: 'default', 
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div className="llo-icon-container" style={{ opacity: 0.5 }}>
              <img src="/favicon.png" alt="LLO" className="llo-icon" />
            </div>
            <div className="llo-text">
              <div className="llo-label" style={{ opacity: 0.7 }}>Sent LLO {message.mediaType}</div>
              <div className="llo-sub" style={{ opacity: 0.5 }}>Waiting for view</div>
            </div>
          </div>
        );
      }

      return (
        <button 
          onClick={handleOpenViewOnce}
          className="llo-btn"
          style={{
            background: isOwn ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'var(--bg-input)',
            border: isOwn ? 'none' : '2px dashed var(--sky-500)'
          }}
        >
          <div className="llo-icon-container">
            <img src="/src/assets/logo.png" alt="LLO" className="llo-icon llo-pulse-animation" />
          </div>
          <div className="llo-text">
            <div className="llo-label">LLO {message.mediaType}</div>
            <div className="llo-sub">Click to view (7s)</div>
          </div>
        </button>
      );
    }

    const ViewerOverlay = (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#0a0a0a',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        color: 'white'
      }}>
        <div className="llo-viewer-header" style={{ position: 'fixed', top: 0, left: 0, right: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/favicon.png" alt="LLO" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '0.5px' }}>LLO {message.mediaType.toUpperCase()}</span>
                <span style={{ opacity: 0.6, fontSize: '12px' }}>From {isOwn ? 'You' : 'Friend'}</span>
              </div>
            </div>
            <button 
              onClick={handleManualClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={26} />
            </button>
          </div>
          <div className="llo-timer-bar" style={{ marginTop: '12px' }}>
            <div 
              className="llo-timer-progress"
              style={{ 
                width: `${(timer / 7) * 100}%`, 
                height: '100%',
                transition: 'width 1s linear' 
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {message.mediaType === 'image' ? (
            <img 
              src={message.mediaUrl} 
              alt="LLO" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100vh', 
                width: '100vw', 
                height: '100vh', 
                objectFit: 'contain' 
              }} 
            />
          ) : (
            <video 
              src={message.mediaUrl} 
              autoPlay 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100vh', 
                width: '100vw', 
                height: '100vh', 
                objectFit: 'contain' 
              }}
              onEnded={handleManualClose} 
            />
          )}
        </div>
      </div>
    );

    if (message.isViewOnce && isOpened && timer > 0) {
      return createPortal(ViewerOverlay, document.body);
    }

    if (message.mediaType === 'image' && message.mediaUrl) {
      return (
        <div style={{ marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
          <img src={message.mediaUrl} alt="attachment" style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }} />
        </div>
      );
    }
    
    if (message.mediaType === 'video' && message.mediaUrl) {
      return (
        <div style={{ marginBottom: '8px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
          <video 
            src={message.mediaUrl} 
            controls 
            style={{ maxWidth: '100%', maxHeight: '400px', display: 'block' }} 
          />
        </div>
      );
    }

    if (message.mediaType === 'audio' && message.mediaUrl) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '8px 4px',
          minWidth: '200px'
        }}>
          <button 
            onClick={() => {
              if (isPlaying) audioRef.current.pause();
              else audioRef.current.play();
              setIsPlaying(!isPlaying);
            }}
            style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '50%', 
              background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--bg-input)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isOwn ? 'white' : 'var(--sky-500)',
              cursor: 'pointer'
            }}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ height: '3px', background: isOwn ? 'rgba(255,255,255,0.3)' : 'var(--border-color)', borderRadius: '2px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: isPlaying ? '100%' : '0%', background: isOwn ? 'white' : 'var(--sky-500)', borderRadius: '2px', transition: 'width 0.1s linear' }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span>Voice Message</span>
              <Mic size={10} />
            </div>
          </div>
          <audio 
            ref={audioRef} 
            src={message.mediaUrl} 
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            style={{ display: 'none' }} 
          />
        </div>
      );
    }

    if (message.mediaType === 'sticker' || (message.text && isOnlyEmoji(message.text) && message.text.length <= 4)) {
      return (
        <div style={{ fontSize: '48px', padding: '8px 0' }}>
          {message.text}
        </div>
      );
    }

    if (message.mediaType === 'call') {
      const text = message.text || '';
      const isMissed = text.toLowerCase().includes('missed');
      const isVideo = text.toLowerCase().includes('video');
      
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '8px 12px',
          background: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          color: isMissed ? '#ef4444' : (isOwn ? 'white' : 'var(--sky-500)'),
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isMissed ? 'rgba(239, 68, 68, 0.1)' : (isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(14, 165, 233, 0.1)'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isMissed ? (
               isVideo ? <VideoOff size={16} /> : <PhoneOff size={16} />
            ) : (
               isVideo ? <Video size={16} /> : <Phone size={16} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{message.text}</span>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>
              {isMissed ? 'No answer' : 'Call ended'}
            </span>
          </div>
        </div>
      );
    }

    return message.text && <p style={{ margin: 0, wordBreak: 'break-word' }}>{message.text}</p>;
  };

  const isStickerMode = message.mediaType === 'sticker' || (message.text && isOnlyEmoji(message.text) && message.text.length <= 4);

  if (message.deletedFor && message.deletedFor.includes(userId)) {
    return null;
  }

  return (
    <div className={`message-bubble-wrapper ${isOwn ? 'own' : 'other'}`}>
      <div 
        className={`message-bubble ${isOwn ? 'own' : 'other'}`}
        style={isStickerMode ? { background: 'none', boxShadow: 'none', border: 'none', padding: '4px 0' } : {}}
      >
        {renderContent()}
        
        {message.reactions && message.reactions.length > 0 && (
          <div className="reactions-badges" style={{
            position: 'absolute',
            bottom: '-12px',
            [isOwn ? 'right' : 'left']: '12px',
            display: 'flex',
            gap: '2px',
            background: 'var(--bg-paper)',
            padding: '2px 6px',
            borderRadius: '10px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid var(--border-light)',
            zIndex: 10
          }}>
            {message.reactions.map((r, i) => (
              <span key={i} title={r.emoji} style={{ fontSize: '12px' }}>{r.emoji}</span>
            ))}
          </div>
        )}

        <div className="message-meta" style={isStickerMode ? { color: '#9ca3af', justifyContent: isOwn ? 'flex-end' : 'flex-start' } : {}}>
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && !message.groupId && (
            <div style={{ display: 'flex', marginLeft: '6px', position: 'relative', width: '18px', height: '14px', flexShrink: 0 }}>
              <Check 
                size={14} 
                style={{ 
                  color: message.read ? '#3b82f6' : (message.delivered ? '#fff' : 'rgba(255,255,255,0.6)'),
                  position: 'absolute',
                  left: 0,
                  strokeWidth: 3
                }} 
              />
              {(message.delivered || message.read) && (
                <Check 
                  size={14} 
                  style={{ 
                    color: message.read ? '#3b82f6' : '#fff',
                    position: 'absolute',
                    left: '5px',
                    strokeWidth: 3
                  }} 
                />
              )}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowReactions(!showReactions)}
          className="reaction-trigger-btn"
          style={{
            position: 'absolute',
            top: '50%',
            [isOwn ? 'left' : 'right']: '-30px',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            opacity: showReactions ? 1 : 0,
            transition: 'opacity 0.2s',
            padding: '4px'
          }}
        >
          <Smile size={18} />
        </button>

        {showReactions && (
          <div className="reaction-picker" style={{
            position: 'absolute',
            top: '-45px',
            [isOwn ? 'left' : 'right']: '0',
            background: 'var(--bg-paper)',
            padding: '4px 8px',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            gap: '8px',
            zIndex: 100,
            border: '1px solid var(--border-color)'
          }}>
            {['❤️', '👍', '😂', '😮', '😢', '🔥'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', transition: 'transform 0.1s' }}
                onMouseEnter={e => e.target.style.transform = 'scale(1.3)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {!message.isDeletedForEveryone && (
          <button 
            onClick={() => setShowDeleteActions(!showDeleteActions)}
            style={{
              position: 'absolute',
              top: '50%',
              [isOwn ? 'left' : 'right']: showReactions ? '-55px' : '-30px',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              opacity: showDeleteActions ? 1 : 0,
              transition: 'opacity 0.2s',
              padding: '4px'
            }}
            className="delete-trigger-btn"
          >
            <Trash2 size={16} />
          </button>
        )}

        {showDeleteActions && (
          <div ref={deleteActionsRef} style={{
            position: 'absolute',
            top: '100%',
            [isOwn ? 'left' : 'right']: '0',
            background: 'var(--bg-paper)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            zIndex: 1000,
            width: '160px',
            marginTop: '8px'
          }}>
            <button 
              onClick={() => handleDelete('me')}
              style={{
                width: '100%',
                padding: '10px 16px',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              className="delete-menu-item"
            >
              Delete for me
            </button>
            {isOwn && (
              <button 
                onClick={() => handleDelete('everyone')}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderTop: '1px solid var(--border-light)'
                }}
                className="delete-menu-item"
              >
                Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
