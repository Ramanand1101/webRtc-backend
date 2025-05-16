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

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.json({
    message: 'Upload successful',
    fileUrl: fileUrl // full download URL
  });
});

// ✅ Serve recording files publicly
app.use('/uploads', express.static(uploadDir));


// // ✅ Initialize HTTP + WebSocket Server
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: '*', // 🔒 Restrict this in production
//   },
// });
// ✅ Load HTTPS certs
const privateKey = fs.readFileSync(path.join(__dirname, 'ssl/key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'ssl/cert.pem'), 'utf8');

const credentials = { key: privateKey, cert: certificate };

// ✅ Create HTTPS server
const server = https.createServer(credentials, app);

// ✅ WebSocket over HTTPS (WSS)
const io = new Server(server, {
  cors: {
    origin: '*', // Limit in production
  },
});

// ✅ WebSocket handlers
io.on('connection', (socket) => {
  socketHandlers(io, socket);
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// let previousCpuUsage = process.cpuUsage();

// setInterval(() => {
//   const mem = process.memoryUsage();
//   const currentCpuUsage = process.cpuUsage(previousCpuUsage);
//   previousCpuUsage = process.cpuUsage();

//   console.log('🧠 Memory Usage:');
//   console.log(`- RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
//   console.log(`- Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
//   console.log(`- Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`);
//   console.log(`- External: ${(mem.external / 1024 / 1024).toFixed(2)} MB`);
//   console.log(`- ArrayBuffers: ${(mem.arrayBuffers / 1024 / 1024).toFixed(2)} MB`);

//   const userCPU = (currentCpuUsage.user / 1000).toFixed(2);     // in ms
//   const systemCPU = (currentCpuUsage.system / 1000).toFixed(2); // in ms
//   const totalCPU = (Number(userCPU) + Number(systemCPU)).toFixed(2);

//   console.log('🔥 CPU Usage (in last 10s):');
//   console.log(`- User: ${userCPU} ms`);
//   console.log(`- System: ${systemCPU} ms`);
//   console.log(`- Total: ${totalCPU} ms`);
//   console.log('----------------------------------');
// }, 10000); // every 10 seconds
