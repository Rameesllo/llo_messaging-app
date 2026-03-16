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

app.use(cors());
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
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of default 30s
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:');
    console.error('Message:', err.message);
  });

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
  res.status(200).json({ 
    status: 'OK', 
    database: statusMap[dbStatus] || 'Unknown',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;