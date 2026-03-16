const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false
  },
  text: {
    type: String,
    trim: true
  },
  mediaUrl: {
    type: String
  },
  mediaType: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  isViewOnce: {
    type: Boolean,
    default: false
  },
  publicId: {
    type: String
  },
  reactions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: String
    }
  ],
  deletedFor: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ],
  isDeletedForEveryone: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Auto-delete messages 24 hours (86400 seconds) after they are SEEN
// messages without readAt (unread) will not be deleted
messageSchema.index({ readAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Message', messageSchema);
