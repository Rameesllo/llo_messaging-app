import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import MessageBubble from './MessageBubble';
import CameraCapture from './CameraCapture';
import { messageAPI, mediaAPI, aiAPI } from '../services/api';
import { Send, Image, MoreVertical, Phone, Video as VideoIcon, Camera, Smile, Mic, ArrowLeft, MessageSquare, X, Sticker, Search, Sparkles, Wand2 } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { emitTyping, emitStopTyping } from '../services/socket';

const ChatWindow = ({ activeChat, user, messages = [], onSendMessage, isUploading, isTyping, onInitiateCall, onBack }) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const emojiPickerRef = useRef(null);
  const stickerPickerRef = useRef(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target)) {
        setShowStickerPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiObject) => {
    setInputText(prev => prev + emojiObject.emoji);
    // Keep picker open for more emojis? Usually better UX
  };

  const handleSendSticker = (emoji) => {
    onSendMessage(emoji, null, 'text', false); // Stickers are never view-once
    setShowStickerPicker(false);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText, null, 'text', false);
      setInputText('');
      setIsViewOnce(false);
      setShowEmojiPicker(false);
      setShowStickerPicker(false);
      
      // Stop typing immediately on send
      handleStopTyping();
    }
  };

  const handleTyping = (e) => {
    setInputText(e.target.value);
    
    if (!isCurrentlyTyping) {
      setIsCurrentlyTyping(true);
      emitTyping({ receiverId: activeChat._id, senderId: (user.id || user._id) });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(handleStopTyping, 3000);
  };

  const handleStopTyping = () => {
    setIsCurrentlyTyping(false);
    emitStopTyping({ receiverId: activeChat._id, senderId: (user.id || user._id) });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result;
          onSendMessage('', base64data, 'audio', isViewOnce);
          setIsViewOnce(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording start error:', err);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        reader.onloadend = () => {
          onSendMessage('', reader.result, 'video', true);
        };
      }
    } catch (err) {
      console.error('File processing error:', err);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    try {
      const { data } = await aiAPI.generate(aiPrompt);
      onSendMessage('', data.imageUrl, 'image', true);
      setIsAIPromptOpen(false);
      setAiPrompt('');
    } catch (err) {
      console.error('AI Generation error:', err);
      alert('Failed to generate image');
    } finally {
      setIsGeneratingAI(false);
    }
  };


  const filteredMessages = searchQuery.trim() 
    ? (messages || []).filter(msg => 
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

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
    <div className="chat-window">
      {/* Professional Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '12px 24px', 
        background: 'rgba(15, 23, 42, 0.4)', 
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="icon-btn mobile-only" 
            onClick={onBack}
            style={{ marginRight: '4px' }}
          >
            <ArrowLeft size={24} />
          </button>
          <div style={{ position: 'relative' }}>
            <img 
              src={activeChat.profilePicture} 
              alt="" 
              className="avatar avatar-sm"
              style={{ width: '40px', height: '40px' }}
            />
            {activeChat.online && <div className="online-indicator"></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>{activeChat.username}</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              {activeChat.online ? 'Online' : 'Recent activity'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {showSearch ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search messages..." 
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  padding: '6px 32px 6px 12px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  width: '200px'
                }}
              />
              <button 
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button className="icon-btn" onClick={() => setShowSearch(true)}><Search size={20} /></button>
          )}
          {!activeChat.isGroup && (
            <>
              <button className="icon-btn" onClick={() => onInitiateCall('voice')}><Phone size={20} /></button>
              <button className="icon-btn" onClick={() => onInitiateCall('video')}><VideoIcon size={20} /></button>
            </>
          )}
          <button className="icon-btn"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-area scrollbar-hide">
        {(filteredMessages || []).length === 0 ? (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <p>{searchQuery ? 'No messages matching your search' : 'No messages yet. Say hello!'}</p>
          </div>
        ) : (
          (filteredMessages || []).map((msg, idx) => {
            if (!msg) return null;
            const currentUserId = (user?.id || user?._id || '').toString();
            return <MessageBubble key={idx} message={msg} isOwn={msg.senderId === currentUserId} userId={currentUserId} />;
          })
        )}
        {isTyping && (
          <div className="message-bubble-wrapper other">
             <div className="message-bubble other typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Integrated Input Bar */}
      <div className="input-area" style={{ position: 'relative' }}>
        {/* Emoji Picker Overlay */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="emoji-picker-container" style={{ bottom: '100%', left: '16px', marginBottom: '8px' }}>
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              autoFocusSearch={false}
              theme="light"
              width={350}
              height={400}
            />
          </div>
        )}

        {/* Sticker Picker Overlay */}
        {showStickerPicker && (
          <div ref={stickerPickerRef} className="sticker-picker-container" style={{ bottom: '100%', left: '16px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Stickers</h3>
              <button 
                onClick={() => setShowStickerPicker(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="sticker-grid">
              {stickers.map(sticker => (
                <div 
                  key={sticker.id} 
                  className="sticker-item" 
                  onClick={() => handleSendSticker(sticker.emoji)}
                  style={{ fontSize: '40px', cursor: 'pointer' }}
                >
                  {sticker.emoji}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pill-input-container">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,video/*"
          />
          
          {isRecording ? (
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-input)', padding: '8px 16px', borderRadius: '24px' }}>
              <div className="recording-pulse"></div>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>Recording {formatDuration(recordingDuration)}</span>
              <button 
                type="button"
                onClick={stopRecording}
                style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                Stop & Send
              </button>
              <button 
                type="button"
                onClick={() => { mediaRecorderRef.current.onstop = null; stopRecording(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {isAIPromptOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: '16px',
                  marginBottom: '8px',
                  background: 'var(--bg-paper)',
                  backdropFilter: 'blur(20px)',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  width: '300px',
                  zIndex: 100
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: 'var(--sky-500)' }}>AI Image Creator</h3>
                    <button onClick={() => setIsAIPromptOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the image you want..."
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      resize: 'none',
                      marginBottom: '12px',
                      outline: 'none'
                    }}
                  />
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || !aiPrompt.trim()}
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {isGeneratingAI ? 'Creating...' : <><Sparkles size={16} /> Generate</>}
                  </button>
                </div>
              )}

              <button 
                type="button"
                className="icon-btn" 
                onClick={() => setIsAIPromptOpen(!isAIPromptOpen)} 
                title="AI Generate Image"
                style={{ color: isAIPromptOpen ? 'var(--sky-500)' : 'inherit' }}
              >
                <Wand2 size={24} />
              </button>

              <button 
                type="button"
                className="chat-input-icon-btn" 
                onClick={() => setShowCamera(true)}
                title="Take Photo"
              >
                <Camera size={20} />
              </button>

              <button 
                type="button"
                className="icon-btn" 
                onClick={() => fileInputRef.current.click()} 
                title="Send Media"
              >
                <Image size={24} />
              </button>

              <button 
                type="button"
                className={`icon-btn ${showStickerPicker ? 'active' : ''}`}
                onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}
                title="Send Stickers"
                style={{ color: showStickerPicker ? '#0ea5e9' : 'inherit' }}
              >
                <Sticker size={24} />
              </button>
              
              <div className="pill-input">
                <button 
                  type="button"
                  className="icon-btn" 
                  style={{ padding: '4px' }} 
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
                  title="Add Emoji"
                >
                  <Smile size={22} style={{ color: showEmojiPicker ? '#0ea5e9' : '#6b7280' }} />
                </button>
                <form onSubmit={handleSend} style={{ flexGrow: 1, display: 'flex' }}>
                  <input
                    type="text"
                    placeholder={isUploading || isGeneratingAI ? "Processing..." : "Type a message"}
                    disabled={isUploading || isGeneratingAI}
                    value={inputText}
                    onChange={handleTyping}
                    onFocus={() => { setShowEmojiPicker(false); setShowStickerPicker(false); }}
                  />
                </form>
              </div>

              {inputText.trim() ? (
                <button 
                  type="button"
                  onClick={handleSend}
                  disabled={isUploading || isGeneratingAI}
                  className="send-btn"
                  style={{ flexShrink: 0 }}
                >
                  <Send size={20} />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={startRecording}
                  disabled={isUploading || isGeneratingAI}
                  className="send-btn"
                  title="Hold to Record"
                  style={{ flexShrink: 0 }}
                >
                  <Mic size={20} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Camera Capture — rendered via portal to escape backdrop-filter stacking context */}
      {showCamera && createPortal(
        <CameraCapture
          onCapture={(dataUrl) => {
            onSendMessage('', dataUrl, 'image', isViewOnce);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />,
        document.body
      )}
    </div>
  );
};

// Maintenance: Forced reload to clear potential stale references
export default ChatWindow;
