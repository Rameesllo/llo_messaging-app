const User = require('../models/User');

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json([]);
    }

    const currentUser = await User.findById(req.user.id);
    const myFriendIds = currentUser.friends.map(id => id.toString());

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('username profilePicture bio online friends');

    const results = users.map(u => {
      const uObj = u.toObject();
      const uFriendIds = u.friends.map(id => id.toString());
      const mutualCount = uFriendIds.filter(id => myFriendIds.includes(id)).length;
      
      return {
        _id: uObj._id,
        username: uObj.username,
        profilePicture: uObj.profilePicture,
        bio: uObj.bio,
        online: uObj.online,
        mutualCount
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username profilePicture bio online createdAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    if (friendId === userId) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    const user = await User.findById(userId);
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    user.friends.push(friendId);
    await user.friends.push(friendId); // Just a precaution
    // Actually we need to add to both sides usually for "Snapchat" style, 
    // but let's stick to one-sided Following/Adding for simplicity or two-sided if requested.
    // Let's do two-sided for "Friends"
    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: 'User not found' });
    
    user.friends.addToSet(friendId);
    friend.friends.addToSet(userId);
    
    await user.save();
    await friend.save();

    res.json({ message: 'Friend added successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'username profilePicture bio online');
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, profilePicture, gender, dateOfBirth, onboardingCompleted, bio } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) user.username = username;
    if (profilePicture) user.profilePicture = profilePicture;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (onboardingCompleted !== undefined) user.onboardingCompleted = onboardingCompleted;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        profilePicture: user.profilePicture,
        bio: user.bio,
        online: user.online,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        onboardingCompleted: user.onboardingCompleted
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getMutualFriends = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.id;

    if (otherUserId === userId) return res.json([]);

    const currentUser = await User.findById(userId).select('friends');
    const otherUser = await User.findById(otherUserId).select('friends');

    if (!currentUser || !otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find intersection of friends arrays
    const mutualFriendIds = currentUser.friends.filter(id => 
      otherUser.friends.map(fid => fid.toString()).includes(id.toString())
    );

    const mutualFriends = await User.find({
      _id: { $in: mutualFriendIds }
    }).select('username profilePicture online bio');

    res.json(mutualFriends);
  } catch (err) {
    console.error('Mutual friends error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
