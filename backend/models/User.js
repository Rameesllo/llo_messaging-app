const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phoneNumber: {
    type: String,
    unique: true,
    trim: true,
    sparse: true // Allows multiple null/missing values while keeping unique constraint for others
  },
  profilePicture: {
    type: String,
    default: 'https://res.cloudinary.com/demo/image/upload/d_avatar.png/avatar.png'
  },
  bio: {
    type: String,
    maxlength: 160,
    default: ''
  },
  online: {
    type: Boolean,
    default: false
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    sparse: true
  },
  dateOfBirth: {
    type: Date,
    sparse: true
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
