const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const userSchema = new mongoose.Schema({
  username: String,
});

const User = mongoose.model('User', userSchema);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const users = await User.find({}, 'username');
    console.log('--- USER LIST ---');
    console.log('Total users:', users.length);
    users.forEach(u => console.log(`- ${u.username}`));
    console.log('-----------------');
    process.exit();
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
