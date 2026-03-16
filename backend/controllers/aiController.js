const axios = require('axios');

exports.generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

    console.log('Generating AI image for prompt:', prompt);

    // Using a free/demo image generation API (Pollinations.ai is great for simple demos)
    // In a real production app, you'd use OpenAI DALL-E or Stable Diffusion API with a key.
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=512&height=512&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;

    // To ensure Cloudinary handles it, we should probably pipe it or just return the URL
    // but the user wants to "sent photo", so the frontend will take this URL, 
    // maybe preview it, and then upload it to Cloudinary as part of the normal flow.
    
    res.json({ imageUrl });
  } catch (err) {
    console.error('AI Generation error:', err);
    res.status(500).json({ message: 'AI Generation failed', error: err.message });
  }
};

exports.proxyImage = async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    response.data.pipe(res);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Error proxying image');
  }
};
