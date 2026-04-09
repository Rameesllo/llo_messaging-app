const User = require('../models/User');

const onlineUsers = new Map(); // userId -> socketId

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', async (userId) => {
      if (userId) {
        socket.join(userId.toString());
        await User.findByIdAndUpdate(userId, { online: true });
        io.emit('userOnline', userId);
        console.log(`User ${userId} joined room and is online`);
      }
    });

    socket.on('sendMessage', async (message) => {
      console.log('Socket sendMessage received:', {
        msgId: message._id,
        sender: message.senderId,
        receiver: message.receiverId,
        group: message.groupId
      });

      if (message.groupId) {
        const Group = require('../models/Group');
        const group = await Group.findById(message.groupId);
        if (group) {
          group.members.forEach(memberId => {
            if (memberId && memberId.toString() !== message.senderId?.toString()) {
              io.to(memberId.toString()).emit('receiveMessage', message);
            }
          });
        }
      } else if (message.receiverId) {
        const receiverId = message.receiverId.toString();
        console.log(`Routing message to receiver room: ${receiverId}`);
        io.to(receiverId).emit('receiveMessage', message);
      } else {
        console.warn('Socket sendMessage: No receiverId or groupId found in message');
      }
    });

    socket.on('messageDelivered', async ({ messageId, senderId }) => {
      try {
        const Message = require('../models/Message');
        const updatedMsg = await Message.findByIdAndUpdate(messageId, { 
          delivered: true, 
          deliveredAt: new Date() 
        }, { new: true });
        
        if (updatedMsg && senderId) {
          io.to(senderId.toString()).emit('messageStatusUpdate', { 
            messageId, 
            status: 'delivered',
            delivered: true 
          });
        }
      } catch (err) {
        console.error('Error in messageDelivered socket:', err);
      }
    });

    socket.on('messageRead', async ({ messageId, senderId }) => {
      try {
        const Message = require('../models/Message');
        const updatedMsg = await Message.findByIdAndUpdate(messageId, { 
          read: true, 
          readAt: new Date(),
          delivered: true // If read, it must be delivered
        }, { new: true });
        
        if (updatedMsg && senderId) {
          io.to(senderId.toString()).emit('messageStatusUpdate', { 
            messageId, 
            status: 'seen',
            read: true 
          });
        }
      } catch (err) {
        console.error('Error in messageRead socket:', err);
      }
    });

    socket.on('typing', ({ receiverId, senderId }) => {
      io.to(receiverId.toString()).emit('displayTyping', { senderId });
    });

    socket.on('stopTyping', ({ receiverId, senderId }) => {
      io.to(receiverId.toString()).emit('hideTyping', { senderId });
    });

    socket.on('reaction', ({ receiverId, messageId, reactions }) => {
      io.to(receiverId.toString()).emit('receiveReaction', { messageId, reactions });
    });

    socket.on('deleteMessage', async (data) => {
      // data: { messageId, type: 'everyone'|'me', receiverId, groupId }
      if (data.type === 'everyone') {
        if (data.groupId) {
          const Group = require('../models/Group');
          const group = await Group.findById(data.groupId);
          if (group) {
            group.members.forEach(memberId => {
              io.to(memberId.toString()).emit('messageDeleted', data);
            });
          }
        } else if (data.receiverId) {
          io.to(data.receiverId.toString()).emit('messageDeleted', data);
          // Also emit to sender (other sessions)
          io.to(socket.userId || data.senderId).emit('messageDeleted', data);
        }
      }
    });

    socket.on('clearChat', async (data) => {
      // data: { chatId, isGroup, senderId }
      if (data.isGroup) {
        const Group = require('../models/Group');
        const group = await Group.findById(data.chatId);
        if (group) {
          group.members.forEach(memberId => {
            io.to(memberId.toString()).emit('chatCleared', data);
          });
        }
      } else {
        io.to(data.chatId.toString()).emit('chatCleared', data);
        // Also notify other sessions of the sender
        if (data.senderId) {
          io.to(data.senderId.toString()).emit('chatCleared', data);
        }
      }
    });

    // Calling Signaling (Using Rooms)
    socket.on('call-user', ({ to, from, offer, callType }) => {
      console.log(`Call initiation: from ${from._id} to ${to} (${callType})`);
      io.to(to.toString()).emit('incoming-call', { from, offer, callType });
    });

    socket.on('make-answer', ({ to, answer }) => {
      console.log(`Call answer: to ${to}`);
      io.to(to.toString()).emit('call-answered', { answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(to.toString()).emit('ice-candidate', { candidate });
    });

    socket.on('end-call', ({ to }) => {
      console.log(`Call end: to ${to}`);
      io.to(to.toString()).emit('call-ended');
    });

    socket.on('reject-call', ({ to }) => {
      console.log(`Call reject: to ${to}`);
      io.to(to.toString()).emit('call-rejected');
    });

    socket.on('disconnect', () => {
      // In room-based, we don't need manual map cleanup
      // But we still need to set offline status if all sockets for user are gone
      // To keep it simple and original-logic-friendly:
      console.log('User disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;
