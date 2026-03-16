const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function checkCloudinary() {
  console.log('Testing Cloudinary with config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? 'present' : 'missing',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'present' : 'missing'
  });

  try {
    const result = await cloudinary.api.ping();
    console.log('Cloudinary Ping Result:', result);
  } catch (err) {
    console.error('Cloudinary Connection Error:', err.message);
  }
}

checkCloudinary();
