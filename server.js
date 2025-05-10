const http = require('http');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const socketHandlers = require('./sockets/socketHandlers');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());

// ✅ Create uploads directory if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ Configure Multer for .webm file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `host-recording-${Date.now()}.webm`)
});
const upload = multer({ storage });

// ✅ API to upload recording from host
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({
    message: 'Upload successful',
    fileUrl: `/uploads/${req.file.filename}`
  });
});

// ✅ Serve recording files publicly
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

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
