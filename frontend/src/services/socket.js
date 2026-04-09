import { io } from 'socket.io-client';

let socket;

export const initiateSocket = (userId) => {
  if (!socket) {
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    console.log(`Connecting to socket at: ${BACKEND_URL}`);
    socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Socket connected successfully:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }
  
  if (socket && userId) {
    console.log(`Socket emitting join for user: ${userId}`);
    socket.emit('join', userId.toString());
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

export const emitClearChat = (data) => {
  if (socket) socket.emit('clearChat', data);
};

export const subscribeToClearChat = (cb) => {
  if (!socket) return () => {};
  socket.on('chatCleared', cb);
  return () => socket.off('chatCleared', cb);
};

export default socket;
