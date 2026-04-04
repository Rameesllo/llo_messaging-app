const Message = require('../models/Message');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.sendMessage = async (req, res) => {
  try {
    let { receiverId, groupId, text, mediaUrl, mediaType, isViewOnce, publicId } = req.body;
    const senderId = req.user.id;

    console.log('--- Send Message Attempt ---', {
      senderId,
      receiverId,
      mediaType,
      textLen: text?.length
    });

    // Force isViewOnce for all images and videos
    if (mediaType === 'image' || mediaType === 'video') {
      isViewOnce = true;
    }

    if (groupId) {
      const Group = require('../models/Group');
      const group = await Group.findById(groupId);
      if (!group || !group.members.some(id => id.toString() === senderId)) {
        return res.status(403).json({ message: 'You are not a member of this group' });
      }
    } else if (receiverId) {
      const sender = await User.findById(senderId);
      const isFriend = sender.friends.some(id => id.toString() === receiverId);
      
      if (!isFriend) {
        console.warn('Friend validation failed:', { senderId, receiverId });
        return res.status(403).json({ message: 'You can only message your friends' });
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId: groupId ? null : (receiverId || null),
      groupId: groupId || null,
      text,
      mediaUrl,
      mediaType,
      isViewOnce,
      publicId
    });
    
    await newMessage.save();

    const sender = await User.findById(senderId).select('username profilePicture');
    
    // Create response object with sender details
    const responseData = {
      ...newMessage.toObject(),
      senderUsername: sender.username,
      senderProfilePicture: sender.profilePicture
    };

    res.status(201).json(responseData);
  } catch (err) {
    console.error('CRITICAL: Send message error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params; // In case of group, this is groupId
    const userId = req.user.id;

    // Check if it's a group
    const Group = require('../models/Group');
    const isGroup = await Group.exists({ _id: otherUserId });

    let query;
    if (isGroup) {
      query = { groupId: otherUserId };
    } else {
      query = {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      };
    }

    const messages = await Message.find({
      ...query,
      $nor: [{ isViewOnce: true, read: true }]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error('CRITICAL: Get messages error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all unique users we've chatted with
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });

    const conversationsMap = new Map();

    for (const msg of messages) {
      if (!msg.senderId || (!msg.receiverId && !msg.groupId)) continue;

      const otherUserId = msg.senderId.toString() === userId 
        ? (msg.receiverId ? msg.receiverId.toString() : null)
        : msg.senderId.toString();
      
      if (otherUserId && !conversationsMap.has(otherUserId)) {
        // Double check if there are ANY non-deleted messages (redundant but safe)
        const hasMessages = await Message.exists({
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId }
          ],
          // Filter out viewed LLOs so they don't reappear on refresh
          $nor: [{ isViewOnce: true, read: true }]
        });

        if (!hasMessages) continue;

        // Get unread count for this specific chat
        const unreadCount = await Message.countDocuments({
          senderId: otherUserId,
          receiverId: userId,
          read: false
        });

        // Get user details
        const otherUser = await User.findById(otherUserId).select('username profilePicture online bio');
        if (!otherUser) continue;

        conversationsMap.set(otherUserId, {
          _id: msg._id,
          lastMessage: {
            text: msg.text,
            mediaType: msg.mediaType,
            createdAt: msg.createdAt
          },
          otherUser,
          unreadCount,
          createdAt: msg.createdAt
        });
      }
    }

    res.json(Array.from(conversationsMap.values()));
  } catch (err) {
    console.error('CRITICAL: Get conversations error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.id;

    // 2. Mark remaining regular messages as read (exclude LLOs)
    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, read: false, isViewOnce: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('CRITICAL: Mark as read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.cleanupMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.id;

    // Physically delete all messages that have been read in this chat
    const messagesToDelete = await Message.find({
      $or: [
        { senderId: otherUserId, receiverId: userId, read: true },
        { senderId: userId, receiverId: otherUserId, read: true }
      ]
    });

    for (const msg of messagesToDelete) {
      if (msg.publicId) {
        try {
          await cloudinary.uploader.destroy(msg.publicId, { 
            resource_type: msg.mediaType === 'audio' ? 'video' : msg.mediaType 
          });
        } catch (e) {}
      }
      await Message.findByIdAndDelete(msg._id);
    }

    res.json({ message: 'Chat cleaned up' });
  } catch (err) {
    console.error('Cleanup messages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // Remove reaction if already exists
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Remove any other reaction from this user first (optional, WhatsApp allows multiple?)
      // WhatsApp allows only one reaction per user usually.
      const userReactionIndex = message.reactions.findIndex(r => r.userId.toString() === userId);
      if (userReactionIndex > -1) {
        message.reactions.splice(userReactionIndex, 1);
      }
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    res.json(message);
  } catch (err) {
    console.error('CRITICAL: Toggle reaction error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.body; // 'me' or 'everyone'
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message already gone or not found' });

    if (type === 'everyone' || message.isViewOnce) {
      // Physical deletion logic
      if (message.publicId) {
        try {
          await cloudinary.uploader.destroy(message.publicId, { 
            resource_type: message.mediaType === 'audio' ? 'video' : message.mediaType 
          });
        } catch (cloudErr) {
          console.error('Cloudinary delete error:', cloudErr);
        }
      }

      await Message.findByIdAndDelete(messageId);
      console.log('LLO/Message physically deleted:', messageId);
      res.json({ message: 'Message permanently deleted', messageId });
    } else {
      // Delete for me - keep DB record but add to hidden list (standard behavior)
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
      res.json({ message: 'Message hidden for you' });
    }
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.markViewed = async (req, res) => {
  try {
    const { messageId } = req.params;
    await Message.findByIdAndUpdate(messageId, { $set: { read: true, readAt: new Date() } });
    res.json({ message: 'LLO marked as viewed' });
  } catch (err) {
    console.error('Mark viewed error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
