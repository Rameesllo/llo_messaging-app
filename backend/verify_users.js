const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const users = await User.find({}, 'username email password');
        console.log(`Found ${users.length} users`);
        
        users.forEach(u => {
            if (!u.password) {
                console.error(`User ${u.username} (${u.email}) is MISSING A PASSWORD!`);
            } else {
                console.log(`User ${u.username}: Password OK (length: ${u.password.length})`);
            }
        });
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

check();
