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

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.members = group.members.filter(id => id.toString() !== userId);
    
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(groupId);
      await Message.deleteMany({ groupId });
    } else {
      // If admin leaves, assign new admin
      if (group.admin.toString() === userId) {
        group.admin = group.members[0];
      }
      await group.save();
    }

    res.json({ message: 'Successfully left the group' });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.admin.toString() !== userId) {
      return res.status(403).json({ message: 'Only admins can delete the group' });
    }

    await Group.findByIdAndDelete(groupId);
    await Message.deleteMany({ groupId });

    res.json({ message: 'Group and all associated messages deleted successfully' });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
