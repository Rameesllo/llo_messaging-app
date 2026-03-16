const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadMedia = async (req, res) => {
  try {
    const { file, resourceType } = req.body;
    
    console.log('Upload Request Body DEBUG:', { 
      hasFile: !!file, 
      fileType: typeof file, 
      fileLength: file?.length,
      fileStart: typeof file === 'string' ? file.substring(0, 50) : 'N/A',
      resourceType 
    });

    if (!file) return res.status(400).json({ message: 'No file provided' });

    // Validate if it's a data URL or a link
    if (typeof file === 'string') {
      if (!file.startsWith('data:') && !file.startsWith('http')) {
        console.error('Validation Error: Invalid file format');
        return res.status(400).json({ message: 'Invalid file data format' });
      }
      if (file.length < 50 && !file.startsWith('http')) {
        console.error('Validation Error: File too short');
        return res.status(400).json({ message: 'File data too short or empty' });
      }
    }

    const uploadResponse = await cloudinary.uploader.upload(file, {
      resource_type: resourceType === 'audio' ? 'video' : resourceType,
      folder: 'chat_app',
      quality: 'auto',
      fetch_format: 'auto',
      transformation: []
    });

    res.json({
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });
  } catch (err) {
    console.error('Cloudinary upload error details:', err);
    res.status(500).json({ message: 'Media upload failed', error: err.message });
  }
};
