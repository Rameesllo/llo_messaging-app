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
          <div className="llo-btn opened">
             <div className="llo-icon-container">
               <Check size={20} className="llo-icon" />
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
          <div className="llo-btn sender-locked">
            <div className="llo-icon-container sender-locked-icon">
              <img src="/favicon.png" alt="LLO" className="llo-icon" />
            </div>
            <div className="llo-text">
              <div className="llo-label sender-locked-label">Sent LLO {message.mediaType}</div>
              <div className="llo-sub sender-locked-sub">Waiting for view</div>
            </div>
          </div>
        );
      }

      return (
        <button 
          onClick={handleOpenViewOnce}
          className={`llo-btn ${isOwn ? 'own' : 'other'}-locked`}
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
      <div className="llo-viewer-overlay">
        <div className="llo-viewer-header-fixed">
          <div className="llo-viewer-header-content">
            <div className="llo-viewer-user-info">
              <div className="llo-viewer-avatar-bg">
                <img src="/favicon.png" alt="LLO" className="llo-viewer-avatar" />
              </div>
              <div className="llo-viewer-meta">
                <span className="llo-viewer-title">LLO {message.mediaType.toUpperCase()}</span>
                <span className="llo-viewer-subtitle">From {isOwn ? 'You' : 'Friend'}</span>
              </div>
            </div>
            <button 
              onClick={handleManualClose}
              className="llo-viewer-close-btn"
            >
              <X size={26} />
            </button>
          </div>
          <div className="llo-timer-bar">
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

        <div className="llo-viewer-media-container">
          {message.mediaType === 'image' ? (
            <img 
              src={message.mediaUrl} 
              alt="LLO" 
              className="llo-viewer-media"
            />
          ) : (
            <video 
              src={message.mediaUrl} 
              autoPlay 
              className="llo-viewer-media"
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
        <div className="message-image-container">
          <img src={message.mediaUrl} alt="attachment" className="message-image" />
        </div>
      );
    }
    
    if (message.mediaType === 'video' && message.mediaUrl) {
      return (
        <div className="message-video-container">
          <video 
            src={message.mediaUrl} 
            controls 
            className="message-video"
          />
        </div>
      );
    }

    if (message.mediaType === 'audio' && message.mediaUrl) {
      return (
        <div className="voice-message-container">
          <button 
            onClick={() => {
              if (isPlaying) audioRef.current.pause();
              else audioRef.current.play();
              setIsPlaying(!isPlaying);
            }}
            className={`voice-play-btn ${isOwn ? 'own' : 'other'}`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <div className="voice-waveform-container">
            <div className={`voice-waveform-bg ${isOwn ? 'own' : 'other'}`}>
              <div 
                className={`voice-waveform-progress ${isOwn ? 'own' : 'other'}`}
                style={{ width: isPlaying ? '100%' : '0%' }}
              ></div>
            </div>
            <div className="voice-meta">
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
        <div className="sticker-message">
          {message.text}
        </div>
      );
    }

    if (message.mediaType === 'call') {
      const text = message.text || '';
      const isMissed = text.toLowerCase().includes('missed');
      const isVideo = text.toLowerCase().includes('video');
      
      return (
        <div className={`call-message-container ${isOwn ? 'own' : 'other'} ${isMissed ? 'missed' : ''}`}>
          <div className={`call-icon-bg ${isMissed ? 'missed' : (isOwn ? 'own' : 'other')}`}>
            {isMissed ? (
               isVideo ? <VideoOff size={16} /> : <PhoneOff size={16} />
            ) : (
               isVideo ? <Video size={16} /> : <Phone size={16} />
            )}
          </div>
          <div className="call-info">
            <span className="call-text">{message.text}</span>
            <span className="call-sub">
              {isMissed ? 'No answer' : 'Call ended'}
            </span>
          </div>
        </div>
      );
    }

    return message.text && <p className="message-text">{message.text}</p>;
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
