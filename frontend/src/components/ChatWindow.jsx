import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import MessageBubble from './MessageBubble';
import CameraCapture from './CameraCapture';
import { mediaAPI } from '../services/api';
import { Send, Image, MoreVertical, Phone, Video as VideoIcon, Camera, Smile, Mic, ArrowLeft, MessageSquare, X, Sticker, Search, Trash2, LogOut } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { emitTyping, emitStopTyping } from '../services/socket';

/**
 * MessageList Component
 * Optimized with React.memo to prevent unnecessary re-renders when user is typing.
 * Handles the display of messages and the typing indicator.
 */
const MessageList = memo(({ messages, isLoading, isTyping, user, searchQuery, messagesEndRef }) => {
  const filteredMessages = searchQuery.trim() 
    ? (messages || []).filter(msg => 
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
           <p className="text-slate-400 text-sm animate-pulse">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if ((filteredMessages || []).length === 0) {
    return (
      <div className="sidebar-empty-state">
        <p>{searchQuery ? 'No messages matching your search' : 'No messages yet. Say hello!'}</p>
      </div>
    );
  }

  return (
    <>
      {filteredMessages.map((msg) => {
        if (!msg) return null;
        const currentUserId = (user?.id || user?._id || '').toString();
        const senderId = msg.senderId?.toString() || '';
        // Use msg._id as a stable key for optimal React rendering
        return (
          <MessageBubble 
            key={msg._id || msg.id} 
            message={msg} 
            isOwn={senderId === currentUserId} 
            userId={currentUserId} 
          />
        );
      })}
      {isTyping && (
        <div className="message-bubble-wrapper other">
           <div className="message-bubble other typing-indicator">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
           </div>
        </div>
      )}
      {/* Target for auto-scroll */}
      <div ref={messagesEndRef} style={{ float: "left", clear: "both" }} />
    </>
  );
});

/**
 * ChatWindow Component
 * Main container for the chat interface.
 * Implements persistent focus, smooth scrolling, and stable layout.
 */
const ChatWindow = ({ 
  activeChat, user, messages = [], onSendMessage, onDeleteChat, 
  isUploading, isTyping, onInitiateCall, onBack, isLoading
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showCamera, setShowCamera] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Refs for DOM control
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const stickerPickerRef = useRef(null);
  const moreMenuRef = useRef(null);

  const stickers = [
    { id: '1', emoji: '😊', name: 'Happy' },
    { id: '2', emoji: '😎', name: 'Cool' },
    { id: '3', emoji: '❤️', name: 'Love' },
    { id: '4', emoji: '😢', name: 'Sad' },
    { id: '5', emoji: '😲', name: 'Wow' },
    { id: '6', emoji: '😠', name: 'Angry' },
    { id: '7', emoji: '🔥', name: 'Fire' },
    { id: '8', emoji: '🚀', name: 'Rocket' },
    { id: '9', emoji: '🎉', name: 'Party' },
  ];

  // Robust auto-scroll function
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Auto-scroll on new messages or typing state change
  useEffect(() => {
    // Small delay to allow layout to settle
    const timer = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping, scrollToBottom]);

  // Maintain input focus when active chat changes
  useEffect(() => {
    if (activeChat && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeChat]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) setShowEmojiPicker(false);
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target)) setShowStickerPicker(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStopTyping = useCallback(() => {
    setIsCurrentlyTyping(false);
    if (activeChat?._id) {
      emitStopTyping({ receiverId: activeChat._id.toString(), senderId: (user.id || user._id)?.toString() });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [activeChat?._id, user.id, user._id]);

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText, null, 'text', false);
      setInputText('');
      setIsViewOnce(false);
      setShowEmojiPicker(false);
      setShowStickerPicker(false);
      handleStopTyping();
      
      // CRITICAL FIX: Use requestAnimationFrame or setTimeout to ensure focus is restored 
      // after the React state update and DOM reconciliation.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    if (!isCurrentlyTyping) {
      setIsCurrentlyTyping(true);
      emitTyping({ receiverId: activeChat?._id?.toString(), senderId: (user.id || user._id)?.toString() });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleStopTyping, 3000);
  };

  const handleEmojiClick = (emojiObject) => {
    setInputText(prev => prev + emojiObject.emoji);
    // Keep focus after interaction
    inputRef.current?.focus();
  };

  const handleSendSticker = (emoji) => {
    onSendMessage(emoji, null, 'text', false);
    setShowStickerPicker(false);
    inputRef.current?.focus();
  };

  // Recording & Media Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { audioBitsPerSecond: 128000 });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          onSendMessage('', reader.result, 'audio', isViewOnce);
          setIsViewOnce(false);
          inputRef.current?.focus();
        };
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch (err) {
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      inputRef.current?.focus();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        onSendMessage('', compressed, 'image', true);
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => onSendMessage('', reader.result, 'video', true);
      }
    } catch (err) { console.error(err); }
    if (fileInputRef.current) fileInputRef.current.value = '';
    inputRef.current?.focus();
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-sky-500/10 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="w-12 h-12 text-sky-500 opacity-40" />
        </div>
        <h2 className="text-xl font-bold text-white">Your Messages</h2>
        <p className="text-slate-400 text-sm mt-1">Select a contact to start chatting</p>
      </div>
    );
  }

  return (
    <div className="chat-window animate-in">
      {/* Header Section */}
      <div className="chat-header">
        <div className="chat-header-info">
          <button className="icon-btn mobile-only" onClick={onBack} aria-label="Back to contacts">
            <ArrowLeft size={24} />
          </button>
          <div className="sidebar-item-avatar-wrapper">
            <img src={activeChat.profilePicture} alt="" className="avatar avatar-sm" />
            {activeChat.online && <div className="online-indicator"></div>}
          </div>
          <div className="chat-header-user">
            <h2 className="chat-header-username">{activeChat.username}</h2>
            <p className="chat-header-status">{activeChat.online ? 'Online' : 'Recent activity'}</p>
          </div>
        </div>
        
        <div className="chat-header-actions">
          {showSearch ? (
            <div className="auth-input-group">
              <input 
                type="text" placeholder="Search..." autoFocus value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="chat-search-input"
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="chat-search-close">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <button className="icon-btn" onClick={() => setShowSearch(true)} title="Search Messages"><Search size={20} /></button>
              {!activeChat.isGroup && (
                <>
                  <button className="icon-btn mobile-hidden" onClick={() => onInitiateCall('audio')} title="Audio Call"><Mic size={20} /></button>
                  <button className="icon-btn mobile-hidden" onClick={() => onInitiateCall('video')} title="Video Call"><Camera size={20} /></button>
                </>
              )}
            </>
          )}
          
          <div className="relative" ref={moreMenuRef}>
            <button className={`icon-btn ${showMoreMenu ? 'text-sky-500' : ''}`} onClick={() => setShowMoreMenu(!showMoreMenu)}><MoreVertical size={20} /></button>
            {showMoreMenu && (
              <div className="absolute right-0 mt-3 w-52 glass-effect premium-shadow rounded-2xl p-2 z-[100] animate-in filter-none overflow-hidden border border-white/10">
                <button 
                  className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl transition-colors text-red-500 font-semibold"
                  onClick={() => { if (window.confirm('Delete this chat?')) { onDeleteChat(); setShowMoreMenu(false); } }}
                >
                  <Trash2 size={18} /> {activeChat.isGroup ? 'Clear Group' : 'Delete Chat'}
                </button>
                {activeChat.isGroup && (
                  <button 
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/10 rounded-xl transition-colors text-amber-500"
                    onClick={() => { if (window.confirm('Leave group?')) { onDeleteChat(); setShowMoreMenu(false); } }}
                  >
                    <LogOut size={18} /> Leave Group
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="messages-area scrollbar-hide">
        <MessageList 
          messages={messages} 
          isLoading={isLoading} 
          isTyping={isTyping} 
          user={user} 
          searchQuery={searchQuery}
          messagesEndRef={messagesEndRef}
        />
      </div>

      {/* Input Area Section */}
      <div className="input-area">
        {/* Pickers */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="emoji-picker-container glass-effect premium-shadow">
            <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width="100%" height={400} />
          </div>
        )}
        {showStickerPicker && (
          <div ref={stickerPickerRef} className="sticker-picker-container glass-effect premium-shadow">
            <div className="sticker-picker-header">
              <h3 className="sticker-picker-title">Stickers</h3>
              <button onClick={() => setShowStickerPicker(false)} className="sticker-picker-close"><X size={16} /></button>
            </div>
            <div className="sticker-grid">
              {stickers.map(s => <div key={s.id} className="sticker-item" onClick={() => handleSendSticker(s.emoji)}>{s.emoji}</div>)}
            </div>
          </div>
        )}

        <div className="pill-input-container">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
          
          {isRecording ? (
            <div className="recording-overlay">
              <div className="recording-pulse"></div>
              <span className="recording-status">Recording {Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</span>
              <button type="button" onClick={stopRecording} className="recording-stop-btn">Stop & Send</button>
              <button type="button" onClick={() => { mediaRecorderRef.current.onstop = null; stopRecording(); }} className="recording-cancel-btn">Cancel</button>
            </div>
          ) : (
            <div className="chat-input-wrapper">
              <button type="button" className="icon-btn mobile-hidden" onClick={() => setShowCamera(true)} title="Camera"><Camera size={24} /></button>
              <button type="button" className="icon-btn" onClick={() => fileInputRef.current.click()} title="Media"><Image size={24} /></button>
              <button type="button" className={`icon-btn ${showStickerPicker ? 'active' : ''}`} onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }} title="Stickers"><Sticker size={24} /></button>
              
              <div className="pill-input">
                <button type="button" className={`icon-btn ${showEmojiPicker ? 'active' : ''}`} onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} title="Emoji"><Smile size={22} /></button>
                <form onSubmit={handleSend} className="flex-grow flex">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={isUploading ? "Processing..." : "Type a message"}
                    disabled={isUploading}
                    value={inputText}
                    onChange={handleTyping}
                    onFocus={() => { setShowEmojiPicker(false); setShowStickerPicker(false); }}
                  />
                </form>
              </div>
              
              {inputText.trim() ? (
                <button type="button" onClick={handleSend} disabled={isUploading} className="send-btn"><Send size={20} /></button>
              ) : (
                <button type="button" onClick={startRecording} disabled={isUploading} className="send-btn" title="Hold to Record"><Mic size={20} /></button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Portals */}
      {showCamera && createPortal(
        <CameraCapture
          onCapture={(dataUrl) => { onSendMessage('', dataUrl, 'image', isViewOnce); setShowCamera(false); setTimeout(() => inputRef.current?.focus(), 100); }}
          onClose={() => { setShowCamera(false); inputRef.current?.focus(); }}
        />,
        document.body
      )}
    </div>
  );
};

export default ChatWindow;
