// routes/chatRoutes.js
const express = require('express');
const router = express.Router();

const chatHistory = {}; // Shared with socket

router.get('/:roomId', (req, res) => {
  const roomId = req.params.roomId;

  try {
    const messages = chatHistory[roomId] || [];
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error(`❌ Error fetching chat history for room ${roomId}:`, error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { chatRoutes: router, chatHistory };
