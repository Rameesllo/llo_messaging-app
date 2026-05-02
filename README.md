# LLO Messaging App 🚀

A premium, full-stack real-time messaging platform inspired by modern design principles. Built with a glassmorphic "Midnight Zinc" aesthetic, LLO offers a seamless communication experience across all devices.

![LLO Messaging App](https://img.shields.io/badge/Status-Live-success)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?logo=socket.io)

## ✨ Features

- **Real-time Messaging**: Instant text delivery powered by Socket.io.
- **Media Support**: Send and view images, videos, and stickers.
- **Voice & Video Calls**: Integrated real-time calling functionality.
- **Voice Messages**: Record and send audio notes with a built-in wave visualizer.
- **AI Integration**: Chat with a persistent AI assistant for help or companionship.
- **Premium UI/UX**:
  - Glassmorphic design with subtle micro-animations.
  - Persistent input focus and smooth auto-scroll.
  - Fully responsive layout for Mobile, Tablet, and Desktop.
- **Robust Authentication**: Secure login via Username, Email, or **Phone Number**.
- **Social Features**: Discovery system to find new friends and mutual connections.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Lucide Icons, CSS3 (Vanilla).
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Atlas).
- **Media**: Cloudinary (Cloud Storage).
- **Real-time**: Socket.io.
- **Deployment**: Vercel (Frontend), Render (Backend).

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB Atlas account
- Cloudinary account

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rameesllo/llo_messaging-app.git
   cd llo_messaging-app
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` folder:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` folder:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Run the application**:
   - Backend: `npm run dev` (from /backend)
   - Frontend: `npm run dev` (from /frontend)

## 📱 Mobile Layout

The app is optimized for mobile using modern CSS media queries. Key optimizations include:
- **Full-screen Modals**: Easier interaction on small screens.
- **Back Navigation**: Dedicated mobile back-arrow for seamless chat navigation.
- **Adaptive Padding**: Content scales gracefully from 320px to 4K resolutions.

## 📄 License

This project is licensed under the MIT License.

---
Built with ❤️ by [Rameesllo](https://github.com/Rameesllo)
