const Group = require('../models/Group');
const Message = require('../models/Message');

exports.createGroup = async (req, res) => {
  try {
    const { name, members, avatar, description } = req.body;
    const admin = req.user.id;

    const group = new Group({
      name,
      admin,
      members: [...new Set([...members, admin])], // Ensure admin is in members
      avatar: avatar || 'https://cdn-icons-png.flaticon.com/512/166/166258.png',
      description
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getGroups = async (req, res) => {
  console.log('Fetching groups for user:', req.user.id);
  try {
    const userId = req.user.id;
    const groups = await Group.find({ members: userId })
      .populate('members', 'username profilePicture online bio')
      .populate('admin', 'username');
    
    // Enrich with unread counts (simpler version for now)
    const enrichedGroups = await Promise.all(groups.map(async (group) => {
      const lastMsg = await Message.findOne({ groupId: group._id }).sort({ createdAt: -1 });
      return {
        ...group.toObject(),
        lastMessage: lastMsg,
        isGroup: true
      };
    }));

    res.json(enrichedGroups);
  } catch (err) {
    console.error('Get groups error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addGroupMember = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await group.save();
    }
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
