const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

exports.sendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({ message: 'You cannot send a request to yourself' });
    }

    // Check if already friends
    const user = await User.findById(senderId);
    if (user.friends.includes(receiverId)) {
      return res.status(400).json({ message: 'User is already your friend' });
    }

    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already pending or active' });
    }

    const newRequest = new FriendRequest({
      sender: senderId,
      receiver: receiverId
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const userId = req.user.id;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.receiver.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'accepted';
    await request.save();

    // Add to friends list for both users
    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.receiver } });
    await User.findByIdAndUpdate(request.receiver, { $addToSet: { friends: request.sender } });

    // Optionally delete the request record or keep it as history
    // await FriendRequest.findByIdAndDelete(requestId);

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error('Accept friend request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'username profilePicture');

    res.json(requests);
  } catch (err) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query) return res.json([]);

    const requester = await User.findById(userId);
    const requesterFriendIds = requester.friends.map(id => id.toString());

    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: userId }
    }).select('username profilePicture friends');

    const results = users.map(u => {
      const uObj = u.toObject();
      const uFriendIds = (u.friends || []).map(id => id.toString());
      const mutualCount = uFriendIds.filter(id => requesterFriendIds.includes(id)).length;
      
      return {
        _id: uObj._id,
        username: uObj.username,
        profilePicture: uObj.profilePicture,
        mutualCount
      };
    });

    res.json(results);
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
