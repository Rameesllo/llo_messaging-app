const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


dotenv.config();

const app = express();
const server = http.createServer(app);

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Handle preflight requests
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/media', require('./routes/mediaRoutes'));
app.use('/api/friends', require('./routes/friendRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Database Connection
const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.name, err.message);
    if (err.message.includes('buffering timed out')) {
      console.error('👉 Tip: Check your IP Whitelist in Atlas (0.0.0.0/0).');
    }
  }
};

connectDB();

// Monitor connection events
mongoose.connection.on('error', err => console.error('🔴 Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.warn('🟡 Mongoose disconnected'));

// Socket.io setup
const socketHandler = require('./sockets/socketHandler');
socketHandler(io);

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  // Mask URI for safety and clear diagnostic
  const rawUri = process.env.MONGODB_URI;
  let uriStatus = 'NOT FOUND (Check Vercel Settings)';
  
  if (rawUri) {
    if (rawUri.length > 10) {
      uriStatus = `FOUND (${rawUri.substring(0, 8)}...)`;
    } else {
      uriStatus = `FOUND BUT TOO SHORT (${rawUri})`;
    }
  }

  res.status(200).json({ 
    status: 'OK', 
    database: statusMap[dbStatus] || 'Unknown',
    uri_check: uriStatus,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;