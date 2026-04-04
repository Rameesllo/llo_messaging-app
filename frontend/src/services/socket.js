import { io } from 'socket.io-client';

let socket;

export const initiateSocket = (userId) => {
  if (!socket) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let BACKEND_URL = import.meta.env.VITE_API_URL || (isLocal ? `http://${window.location.hostname}:5000` : window.location.origin);
    
    // Fix: Prepend https:// if protocol is missing (consistent with api.js)
    if (BACKEND_URL && !BACKEND_URL.startsWith('http')) {
      BACKEND_URL = `https://${BACKEND_URL}`;
    }
    
    socket = io(BACKEND_URL);
  }
  
  if (socket && userId) {
    console.log(`Socket joining as user: ${userId}`);
    socket.emit('join', userId);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
};

export const subscribeToMessages = (cb) => {
  if (!socket) return () => {};
  const handler = (msg) => cb(null, msg);
  socket.on('receiveMessage', handler);
  return () => socket.off('receiveMessage', handler);
};

export const subscribeToDelete = (cb) => {
  if (!socket) return () => {};
  const handler = (data) => cb(null, data);
  socket.on('messageDeleted', handler);
  return () => socket.off('messageDeleted', handler);
};

export const emitDeleteMessage = (data) => {
  if (socket) socket.emit('deleteMessage', data);
};

export const sendMessageSocket = (message) => {
  if (socket) socket.emit('sendMessage', message);
};

export const subscribeToStatus = (onOnline, onOffline) => {
  if (!socket) return () => {};
  socket.on('userOnline', onOnline);
  socket.on('userOffline', onOffline);
  return () => {
    socket.off('userOnline', onOnline);
    socket.off('userOffline', onOffline);
  };
};

export const emitTyping = (data) => {
  if (socket) socket.emit('typing', data);
};

export const emitStopTyping = (data) => {
  if (socket) socket.emit('stopTyping', data);
};

export const subscribeToTyping = (onStart, onStop) => {
  if (!socket) return () => {};
  socket.on('displayTyping', onStart);
  socket.on('hideTyping', onStop);
  return () => {
    socket.off('displayTyping', onStart);
    socket.off('hideTyping', onStop);
  };
};

export const emitReaction = (data) => {
  if (socket) socket.emit('reaction', data);
};

export const subscribeToReactions = (cb) => {
  if (!socket) return () => {};
  socket.on('receiveReaction', cb);
  return () => socket.off('receiveReaction', cb);
};

export const emitMessageDelivered = (data) => {
  if (socket) socket.emit('messageDelivered', data);
};

export const emitMessageRead = (data) => {
  if (socket) socket.emit('messageRead', data);
};

export const subscribeToMessageStatus = (cb) => {
  if (!socket) return () => {};
  socket.on('messageStatusUpdate', cb);
  return () => socket.off('messageStatusUpdate', cb);
};

// Calling Logic
export const emitCall = (data) => {
  if (socket) socket.emit('call-user', data);
};

export const subscribeToIncomingCall = (cb) => {
  if (!socket) return () => {};
  socket.on('incoming-call', cb);
  return () => socket.off('incoming-call', cb);
};

export const emitAnswer = (data) => {
  if (socket) socket.emit('make-answer', data);
};

export const subscribeToCallAnswered = (cb) => {
  if (!socket) return () => {};
  socket.on('call-answered', cb);
  return () => socket.off('call-answered', cb);
};

export const emitIceCandidate = (data) => {
  if (socket) socket.emit('ice-candidate', data);
};

export const subscribeToIceCandidate = (cb) => {
  if (!socket) return () => {};
  socket.on('ice-candidate', cb);
  return () => socket.off('ice-candidate', cb);
};

export const emitEndCall = (data) => {
  if (socket) socket.emit('end-call', data);
};

export const subscribeToCallEnded = (cb) => {
  if (!socket) return () => {};
  socket.on('call-ended', cb);
  return () => socket.off('call-ended', cb);
};

export const emitRejectCall = (data) => {
  if (socket) socket.emit('reject-call', data);
};

export const subscribeToCallRejected = (cb) => {
  if (!socket) return () => {};
  socket.on('call-rejected', cb);
  return () => socket.off('call-rejected', cb);
};

export default socket;
