const http = require('http');
const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const socketHandlers = require('./sockets/socketHandlers');
// const { chatRoutes } = require('./routes/chatRoute');
let chatHistory = [];

dotenv.config();
connectDB();

const app = express();
app.use(cors());

// ✅ Ensure "uploads" folder exists
// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `host-recording-${timestamp}.webm`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'video/webm') cb(null, true);
  else cb(new Error('Only .webm videos allowed'), false);
};

const upload = multer({ storage, fileFilter });

// POST /upload route
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No video file uploaded' });

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ message: 'Upload successful', fileUrl });
});

// Serve static video files
app.use('/uploads', express.static(uploadDir));
// ✅ Initialize HTTP + WebSocket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // 🔒 Restrict this in production
  },
});

// ✅ WebSocket handlers
io.on('connection', (socket) => {
  socketHandlers(io, socket);
});
// app.use('/api/chat-history', chatRoutes);
// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


